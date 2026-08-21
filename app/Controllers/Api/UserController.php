<?php

namespace App\Controllers\Api;

use App\Models\Conversation;
use App\Models\Message;
use App\Models\Post;
use App\Models\User;
use App\Models\OauthAccessToken;
use App\Services\BackblazeB2Service;
use App\Services\BlockService;
use App\Services\PhoneVerificationService;
use Illuminate\Support\Facades\Validator;

class UserController extends BaseApiController
{
    public function getUsers()
    {
        // if (!$this->isAuthorizedRequest()) {
        //     return $this->json(['success' => false, 'message' => 'Unauthorized'], 401);
        // }

        $limit = (int) ($_GET['limit'] ?? 100);
        $tab = $_GET['tab'] ?? 'all';

        $query = User::query();

        if ($tab === 'active') {
            $query->where('is_active', 1);
        } elseif ($tab === 'inactive') {
            $query->where('is_active', 0);
        }

        $users = $query->select(['id', 'name', 'email', 'role', 'is_active'])
            ->limit($limit)
            ->get();

        return $this->json([
            'success' => true,
            'count' => count($users),
            'data' => $users
        ]);
    }

    public function getAccount()
    {
        $userId = $_GET['id'] ?? null;

        if ($userId !== null && $userId !== '') {
            $user = User::find($userId);
        } else {
            $user = $_SESSION['user'] ?? null;
        }

        if (!$user) {
            return $this->json(['error' => 'User not found'], 404);
        }

        $posts = Post::where('user_id', $userId)->orderBy('created_at', 'DESC')->get();

        $postsArray = is_object($posts) ? $posts->toArray() : $posts;

        foreach ($postsArray as &$post) {
            if (isset($post['options']) && is_string($post['options'])) {
                $post['options'] = json_decode($post['options'], true);
            }
        }

        return $this->json([
            'user' => $user,
            'posts' => $postsArray
        ]);
    }

    public function search()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->json([
                'success' => false,
                'message' => 'Необходима е автентикация.',
            ], 401);
        }

        $search = trim($_GET['search'] ?? '');

        if ($search === '') {
            return $this->json([
                'success' => true,
                'data' => [],
            ]);
        }

        $blockService = new BlockService();
        $excludedIds = array_values(array_unique([
            (int) $user->id,
            ...$blockService->relatedUserIds((int) $user->id),
        ]));

        $normalizedCode = User::normalizePublicCode($search);

        $users = User::query()
            ->where('is_active', true)
            ->whereNotIn('id', $excludedIds)
            ->where(function ($query) use ($search, $normalizedCode) {
                $query
                    ->where('name', 'LIKE', '%' . $search . '%')
                    ->orWhere('username', 'LIKE', '%' . $search . '%');

                if (strlen($normalizedCode) === 8) {
                    $query->orWhere('public_code', $normalizedCode);
                }
            })
            ->orderBy('name')
            ->limit(20)
            ->get();

        return $this->json([
            'success' => true,
            'data' => $users
                ->map(fn(User $found) => $found->toChatUserArray())
                ->values(),
        ]);
    }

    private function authenticatedUser(): ?User
    {
        $authorization =
            $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
            ?? '';

        if (!preg_match('/Bearer\s+(\S+)/i', $authorization, $matches)) {
            return null;
        }

        $accessToken = OauthAccessToken::query()
            ->where('token', $matches[1])
            ->with('user')
            ->first();

        if (
            !$accessToken ||
            $accessToken->isExpired() ||
            !$accessToken->user ||
            !$accessToken->user->is_active
        ) {
            return null;
        }

        return $accessToken->user;
    }

    public function updateProfile()
    {
        try {
            $user = $this->authenticatedUser();

            if (!$user) {
                return $this->unauthorized();
            }

            $input = $this->jsonInput();

            $validator = Validator::make(
                $input,
                [
                    'firstName' => 'required|string|min:2|max:100',
                    'lastName' => 'required|string|min:2|max:100',
                    'gender' => 'nullable|in:male,female',
                    'phone' => 'nullable|string|max:30',
                    'country' => 'nullable|string|max:100',
                    'city' => 'nullable|string|max:100',
                    'address' => 'nullable|string|max:255',
                ],
                [
                    'required' => 'Полето :attribute е задължително.',
                    'string' => 'Полето :attribute трябва да бъде текст.',
                    'min' => 'Полето :attribute трябва да съдържа поне :min символа.',
                    'max' => 'Полето :attribute не може да съдържа повече от :max символа.',
                    'in' => 'Полето :attribute съдържа невалидна стойност.',
                ],
                [
                    'firstName' => 'име',
                    'lastName' => 'фамилия',
                    'gender' => 'пол',
                    'phone' => 'телефон',
                    'country' => 'държава',
                    'city' => 'град',
                    'address' => 'адрес',
                ]
            );

            if ($validator->fails()) {
                return $this->validationError($validator);
            }

            $firstName = trim($input['firstName']);
            $lastName = trim($input['lastName']);

            $user->name = $firstName . ' ' . $lastName;
            $user->first_name = $firstName;
            $user->last_name = $lastName;

            $user->gender = !empty($input['gender'])
                ? trim($input['gender'])
                : null;

            $rawPhone = !empty($input['phone']) ? trim((string) $input['phone']) : null;
            $phone = $rawPhone
                ? (PhoneVerificationService::make()->normalizePhone($rawPhone) ?? $rawPhone)
                : null;
            if ($phone !== $user->phone) {
                $user->phone = $phone;
                $user->phone_verified_at = null;
                $user->phone_verification_hash = null;
                $user->phone_verification_expires_at = null;
                $user->phone_verification_sent_at = null;
                $user->phone_verification_phone = null;
            }

            $user->country = !empty($input['country'])
                ? trim($input['country'])
                : null;

            $user->city = !empty($input['city'])
                ? trim($input['city'])
                : null;

            $user->address = !empty($input['address'])
                ? trim($input['address'])
                : null;

            $user->save();

            return $this->json([
                'success' => true,
                'message' => 'Профилът беше обновен успешно.',
                'user' => $this->serializeMobileUser($user),
            ]);
        } catch (\Throwable $exception) {
            error_log(
                'Update profile error: '
                . $exception->getMessage()
                . PHP_EOL
                . $exception->getTraceAsString()
            );

            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 500);
        }
    }

    public function updateProfileImage()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        if (!isset($_FILES['file'])) {
            return $this->json([
                'success' => false,
                'message' => 'Необходимо е да изпратите снимка.',
            ], 422);
        }

        $file = $_FILES['file'];

        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return $this->json([
                'success' => false,
                'message' => 'Снимката не беше качена успешно.',
            ], 422);
        }

        if (($file['size'] ?? 0) <= 0) {
            return $this->json([
                'success' => false,
                'message' => 'Файлът е празен.',
            ], 422);
        }

        if ((int) $file['size'] > 10 * 1024 * 1024) {
            return $this->json([
                'success' => false,
                'message' => 'Изображението не може да бъде по-голямо от 10 MB.',
            ], 422);
        }

        $tmpName = (string) ($file['tmp_name'] ?? '');
        if (!is_file($tmpName)) {
            return $this->json([
                'success' => false,
                'message' => 'Типът на файла не може да бъде определен.',
            ], 422);
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($tmpName);

        if (
            !is_string($mimeType) ||
            !in_array($mimeType, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)
        ) {
            return $this->json([
                'success' => false,
                'message' => 'Неподдържан формат на изображението.',
            ], 422);
        }

        try {
            $storage = $this->createBackblazeStorage();
            $extension = match ($mimeType) {
                'image/png' => 'png',
                'image/webp' => 'webp',
                'image/gif' => 'gif',
                default => 'jpg',
            };
            $remotePath = sprintf(
                'profile/%s/%s.%s',
                date('Y/m'),
                bin2hex(random_bytes(16)),
                $extension
            );
            $result = $storage->upload($tmpName, $remotePath, $mimeType);
            $url = $storage->url($result['key']);

            $options = is_array($user->options) ? $user->options : [];
            $options['profile_image'] = $url;
            $user->options = $options;
            $user->save();

            return $this->json([
                'success' => true,
                'message' => 'Профилната снимка беше обновена.',
                'user' => $this->serializeMobileUser($user),
            ]);
        } catch (\Throwable $exception) {
            error_log(
                'Update profile image error: '
                . $exception->getMessage()
                . PHP_EOL
                . $exception->getTraceAsString()
            );

            return $this->json([
                'success' => false,
                'message' => 'Профилната снимка не можа да бъде обновена.',
            ], 500);
        }
    }

    public function updatePassword()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();

        $validator = Validator::make(
            $input,
            [
                'currentPassword' => 'required|string',
                'password' => 'required|string|min:6',
                'passwordConfirmation' => 'required|string',
            ],
            [
                'required' => 'Полето :attribute е задължително.',
                'string' => 'Полето :attribute трябва да бъде текст.',
                'min' => 'Полето :attribute трябва да съдържа поне :min символа.',
            ],
            [
                'currentPassword' => 'текуща парола',
                'password' => 'нова парола',
                'passwordConfirmation' => 'потвърждение на паролата',
            ]
        );

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        if (
            !isset($user->password_hash) ||
            !password_verify(
                $input['currentPassword'],
                $user->password_hash
            )
        ) {
            return $this->json([
                'success' => false,
                'message' => 'Текущата парола е грешна.',
                'errors' => [
                    'currentPassword' => [
                        'Текущата парола е грешна.',
                    ],
                ],
            ], 422);
        }

        if ($input['password'] !== $input['passwordConfirmation']) {
            return $this->json([
                'success' => false,
                'message' => 'Паролите не съвпадат.',
                'errors' => [
                    'passwordConfirmation' => [
                        'Паролите не съвпадат.',
                    ],
                ],
            ], 422);
        }

        if (
            password_verify(
                $input['password'],
                $user->password_hash
            )
        ) {
            return $this->json([
                'success' => false,
                'message' => 'Новата парола трябва да бъде различна от текущата.',
                'errors' => [
                    'password' => [
                        'Новата парола трябва да бъде различна от текущата.',
                    ],
                ],
            ], 422);
        }

        $user->password_hash = $input['password'];

        $user->save();

        return $this->json([
            'success' => true,
            'message' => 'Паролата беше променена успешно.',
        ]);
    }

    public function deleteChatMessages()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();

        $validator = Validator::make(
            $input,
            [
                'currentPassword' => 'required|string',
                'confirmation' => 'required|string',
            ],
            [
                'required' => 'Полето :attribute е задължително.',
                'string' => 'Полето :attribute трябва да бъде текст.',
            ],
            [
                'currentPassword' => 'текуща парола',
                'confirmation' => 'потвърждение',
            ]
        );

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        if (
            !password_verify(
                $input['currentPassword'],
                $user->password_hash
            )
        ) {
            return $this->json([
                'success' => false,
                'message' => 'Текущата парола е грешна.',
                'errors' => [
                    'currentPassword' => [
                        'Текущата парола е грешна.',
                    ],
                ],
            ], 422);
        }

        if (trim($input['confirmation']) !== 'delete chat') {
            return $this->json([
                'success' => false,
                'message' =>
                    'Въведете "delete chat", за да потвърдите изтриването.',
                'errors' => [
                    'confirmation' => [
                        'Потвърждението трябва да бъде "delete chat".',
                    ],
                ],
            ], 422);
        }

        try {
            $messages = Message::query()
                ->where(
                    'sender_id',
                    (int) $user->id
                )
                ->get();

            $deletedMessagesCount = $messages->count();

            if ($deletedMessagesCount === 0) {
                return $this->json([
                    'success' => true,
                    'deleted_messages_count' => 0,
                ]);
            }

            $storage = $this->createBackblazeStorage();

            foreach ($messages as $message) {
                if (
                    !in_array(
                        $message->type,
                        ['image', 'file', 'video', 'audio'],
                        true
                    )
                ) {
                    continue;
                }

                $metadata = $message->metadata;

                if (is_string($metadata)) {
                    $metadata = json_decode(
                        $metadata,
                        true
                    );
                }

                if (
                    !is_array($metadata) ||
                    empty($metadata['key'])
                ) {
                    continue;
                }

                $deleted = $storage->delete(
                    $metadata['key']
                );

                if (!$deleted) {
                    throw new \RuntimeException(
                        sprintf(
                            'Backblaze файлът [%s] не можа да бъде изтрит.',
                            $metadata['key']
                        )
                    );
                }
            }

            $conversationIds = $messages
                ->pluck('conversation_id')
                ->unique()
                ->map(fn($id) => (int) $id)
                ->values()
                ->all();

            Message::query()
                ->where(
                    'sender_id',
                    (int) $user->id
                )
                ->delete();

            foreach ($conversationIds as $conversationId) {
                $lastMessage = Message::query()
                    ->where(
                        'conversation_id',
                        $conversationId
                    )
                    ->orderByDesc('id')
                    ->first();

                Conversation::query()
                    ->where('id', $conversationId)
                    ->update([
                        'last_message_id' =>
                            $lastMessage?->id,
                    ]);
            }

            return $this->json([
                'success' => true,
                'deleted_messages_count' =>
                    $deletedMessagesCount,
            ]);
        } catch (\Throwable $exception) {
            error_log(
                'Delete chat messages error: '
                . get_class($exception)
                . ': '
                . $exception->getMessage()
                . PHP_EOL
                . 'File: '
                . $exception->getFile()
                . ':'
                . $exception->getLine()
                . PHP_EOL
                . $exception->getTraceAsString()
            );

            return $this->json([
                'success' => false,
                'message' =>
                    'Съобщенията не можаха да бъдат изтрити.',
            ], 500);
        }
    }

    private function createBackblazeStorage(): BackblazeB2Service
    {
        $keyId = (string) ($_ENV['B2_KEY_ID'] ?? '');
        $applicationKey = (string) (
            $_ENV['B2_APPLICATION_KEY'] ?? ''
        );
        $bucket = (string) ($_ENV['B2_BUCKET'] ?? '');
        $endpoint = (string) ($_ENV['B2_ENDPOINT'] ?? '');
        $region = (string) ($_ENV['B2_REGION'] ?? '');

        if (
            $keyId === '' ||
            $applicationKey === '' ||
            $bucket === '' ||
            $endpoint === '' ||
            $region === ''
        ) {
            throw new \RuntimeException(
                'Липсва конфигурация за Backblaze B2.'
            );
        }

        $storage = new BackblazeB2Service(
            $keyId,
            $applicationKey,
            $bucket,
            $endpoint,
            $region
        );

        $storage->setUseProxy(
            filter_var(
                $_ENV['B2_USE_PROXY'] ?? 'false',
                FILTER_VALIDATE_BOOLEAN
            )
        );

        return $storage;
    }

    private function validationError($validator)
    {
        return $this->json([
            'success' => false,
            'message' => $validator->errors()->first(),
            'errors' => $validator->errors()->toArray(),
        ], 422);
    }

    private function unauthorized()
    {
        return $this->json([
            'success' => false,
            'message' => 'Необходима е автентикация.',
        ], 401);
    }

    private function serializeMobileUser(User $user): array
    {
        return $user->toMobileUserArray();
    }

    private function jsonInput(): array
    {
        $input = json_decode(
            file_get_contents('php://input'),
            true
        );

        return is_array($input) ? $input : [];
    }
}
