<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\Message;
use App\Models\OauthAccessToken;
use App\Models\User;
use App\Services\BackblazeB2Service;
use App\Services\ConversationService;
use App\Services\PushNotificationService;
use App\Services\RealtimeNotifier;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Facades\Validator;

final class MessageController extends BaseController
{
    private ConversationService $conversationService;
    private RealtimeNotifier $realtimeNotifier;
    private PushNotificationService $pushNotificationService;

    public function __construct()
    {
        $this->conversationService = new ConversationService();
        $this->realtimeNotifier = new RealtimeNotifier();
        $this->pushNotificationService = new PushNotificationService();
    }

    public function index($conversationId)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $conversation = $this->conversationService
            ->findUserConversation(
                (int) $conversationId,
                (int) $user->id
            );

        if (!$conversation) {
            return $this->conversationNotFound();
        }

        $limit = (int) ($_GET['limit'] ?? 30);

        $beforeId = isset($_GET['before_id'])
            ? (int) $_GET['before_id']
            : null;

        $result = $this->conversationService->getMessages(
            $conversation,
            $limit,
            $beforeId
        );

        return $this->json([
            'success' => true,
            'data' => $result['messages']
                ->map(
                    fn(Message $message) =>
                    self::serializeMessage($message)
                )
                ->values(),
            'meta' => [
                'has_more' => $result['has_more'],
                'next_before_id' =>
                    $result['next_before_id'],
            ],
        ]);
    }

    public function store($conversationId)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $conversation = $this->conversationService
            ->findUserConversation(
                (int) $conversationId,
                (int) $user->id
            );

        if (!$conversation) {
            return $this->conversationNotFound();
        }

        $input = $this->jsonInput();

        $validator = Validator::make(
            $input,
            [
                'client_message_id' =>
                    'required|string|max:36',

                'content' =>
                    'required|string|max:10000',
            ],
            [
                'required' =>
                    'Полето :attribute е задължително.',

                'string' =>
                    'Полето :attribute трябва да бъде текст.',

                'max' =>
                    'Полето :attribute не може да съдържа повече от :max символа.',
            ],
            [
                'client_message_id' =>
                    'идентификатор на съобщението',

                'content' =>
                    'съобщение',
            ]
        );

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        $content = trim($input['content']);

        if ($content === '') {
            return $this->json([
                'success' => false,
                'message' => 'Съобщението не може да бъде празно.',
            ], 422);
        }

        try {
            $message = $this->conversationService
                ->sendMessage(
                    $conversation,
                    $user,
                    $input['client_message_id'],
                    $content
                );

            try {
                $this->pushNotificationService
                    ->sendMessageNotification(
                        $conversation,
                        $message,
                        $user
                    );
            } catch (Exception $exception) {
                error_log(
                    'Push notification error: '
                    . $exception->getMessage()
                );
            }

            return $this->json([
                'success' => true,
                'data' => self::serializeMessage($message),
            ], 201);
        } catch (Exception $exception) {
            return $this->json([
                'success' => false,
                'message' =>
                    'Съобщението не можа да бъде изпратено.',
            ], 500);
        }
    }

    public function markAsRead($conversationId)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $conversation = $this->conversationService
            ->findUserConversation(
                (int) $conversationId,
                (int) $user->id
            );

        if (!$conversation) {
            return $this->conversationNotFound();
        }

        $input = $this->jsonInput();

        $messageId = isset($input['message_id'])
            ? (int) $input['message_id']
            : null;

        $message = $this->conversationService
            ->markConversationAsRead(
                $conversation,
                $user,
                $messageId
            );

        if (!$message) {
            return $this->json([
                'success' => false,
                'message' => 'Съобщението не е намерено.',
            ], 404);
        }

        $this->realtimeNotifier->notifyMessageRead(
            $conversation,
            (int) $user->id,
            (int) $message->id,
            Carbon::now()->toISOString()
        );

        return $this->json([
            'success' => true,
            'message' =>
                'Съобщенията са отбелязани като прочетени.',
            'last_read_message_id' => $message->id,
        ]);
    }

    public static function serializeMessage(
        Message $message
    ): array {
        return [
            'id' => $message->id,
            'conversation_id' =>
                $message->conversation_id,
            'sender_id' => $message->sender_id,
            'client_message_id' =>
                $message->client_message_id,
            'type' => $message->type,
            'content' => $message->content,
            'metadata' => $message->metadata,
            'status' => $message->status,
            'delivered_at' =>
                $message->delivered_at?->toISOString(),
            'read_at' =>
                $message->read_at?->toISOString(),
            'edited_at' =>
                $message->edited_at?->toISOString(),
            'created_at' =>
                $message->created_at?->toISOString(),
            'sender' => self::serializeUser(
                $message->sender
            ),
        ];
    }

    public function storeAttachment($conversationId)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $conversation = $this->conversationService
            ->findUserConversation(
                (int) $conversationId,
                (int) $user->id
            );

        if (!$conversation) {
            return $this->conversationNotFound();
        }

        $clientMessageId = trim(
            (string) ($_POST['client_message_id'] ?? '')
        );

        $type = trim(
            (string) ($_POST['type'] ?? '')
        );

        if ($clientMessageId === '') {
            return $this->json([
                'success' => false,
                'message' => 'Липсва client_message_id.',
                'errors' => [
                    'client_message_id' => [
                        'Полето client_message_id е задължително.',
                    ],
                ],
            ], 422);
        }

        if (!in_array($type, ['image', 'file'], true)) {
            return $this->json([
                'success' => false,
                'message' => 'Невалиден тип на файла.',
                'errors' => [
                    'type' => [
                        'Типът трябва да бъде image или file.',
                    ],
                ],
            ], 422);
        }

        if (!isset($_FILES['file'])) {
            return $this->json([
                'success' => false,
                'message' => 'Необходимо е да изпратите файл.',
            ], 422);
        }

        $file = $_FILES['file'];

        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return $this->json([
                'success' => false,
                'message' => $this->uploadErrorMessage(
                    (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE)
                ),
            ], 422);
        }

        if (($file['size'] ?? 0) <= 0) {
            return $this->json([
                'success' => false,
                'message' => 'Файлът е празен.',
            ], 422);
        }

        $maxSize = $type === 'image'
            ? 10 * 1024 * 1024
            : 25 * 1024 * 1024;

        if ((int) $file['size'] > $maxSize) {
            return $this->json([
                'success' => false,
                'message' => $type === 'image'
                    ? 'Изображението не може да бъде по-голямо от 10 MB.'
                    : 'Файлът не може да бъде по-голям от 25 MB.',
            ], 422);
        }

        $mimeType = $this->detectMimeType(
            (string) $file['tmp_name']
        );

        if (!$mimeType) {
            return $this->json([
                'success' => false,
                'message' => 'Типът на файла не може да бъде определен.',
            ], 422);
        }

        if (
            $type === 'image' &&
            !in_array(
                $mimeType,
                [
                    'image/jpeg',
                    'image/png',
                    'image/webp',
                    'image/gif',
                ],
                true
            )
        ) {
            return $this->json([
                'success' => false,
                'message' => 'Неподдържан формат на изображението.',
            ], 422);
        }

        try {
            $attachment = $this->uploadAttachmentToB2(
                $file,
                $mimeType
            );

            $message = Message::create([
                'conversation_id' => $conversation->id,
                'sender_id' => $user->id,
                'client_message_id' => $clientMessageId,
                'type' => $type,
                'content' => null,
                'metadata' => $attachment,
                'status' => 'sent',
            ])->load('sender');

            $conversation->last_message_id = $message->id;
            $conversation->save();

            $this->realtimeNotifier->notifyNewMessage(
                $message,
                $conversation
            );

            try {
                $this->pushNotificationService
                    ->sendMessageNotification(
                        $conversation,
                        $message,
                        $user
                    );
            } catch (\Throwable $exception) {
                error_log(
                    'Push notification error: '
                    . $exception->getMessage()
                );
            }

            return $this->json([
                'success' => true,
                'data' => self::serializeMessage($message),
            ], 201);
        } catch (\Throwable $exception) {
            error_log(
                'Attachment upload error: '
                . $exception->getMessage()
                . PHP_EOL
                . $exception->getTraceAsString()
            );

            return $this->json([
                'success' => false,
                'message' => 'Файлът не можа да бъде изпратен.',
            ], 500);
        }
    }

    private function uploadAttachmentToB2(
        array $file,
        string $mimeType
    ): array {
        $storage = $this->createBackblazeStorage();

        $extension = $this->extensionForMimeType(
            $mimeType,
            (string) ($file['name'] ?? '')
        );

        $remotePath = sprintf(
            'chat/%s/%s.%s',
            date('Y/m'),
            bin2hex(random_bytes(16)),
            $extension
        );

        $result = $storage->upload(
            (string) $file['tmp_name'],
            $remotePath,
            $mimeType
        );

        return [
            'key' => $result['key'],
            'url' => $storage->url($result['key']),
            'name' => $file['name'] ?? basename($remotePath),
            'mime_type' => $mimeType,
            'size' => (int) $file['size'],
            'etag' => $result['etag'] ?? null,
        ];
    }

    private function createBackblazeStorage(): BackblazeB2Service
    {
        $keyId = (string) ($_ENV['B2_KEY_ID'] ?? '');
        $applicationKey = (string) ($_ENV['B2_APPLICATION_KEY'] ?? '');
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

        $useProxy = filter_var(
            $_ENV['B2_USE_PROXY'] ?? 'false',
            FILTER_VALIDATE_BOOLEAN
        );

        $storage->setUseProxy($useProxy);

        return $storage;
    }

    private function detectMimeType(
        string $path
    ): ?string {
        if (!is_file($path)) {
            return null;
        }

        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $mimeType = $finfo->file($path);

        return is_string($mimeType)
            ? $mimeType
            : null;
    }

    private function extensionForMimeType(
        string $mimeType,
        string $originalName
    ): string {
        $extensions = [
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'application/pdf' => 'pdf',
            'text/plain' => 'txt',
            'application/zip' => 'zip',
        ];

        if (isset($extensions[$mimeType])) {
            return $extensions[$mimeType];
        }

        $extension = strtolower(
            pathinfo(
                $originalName,
                PATHINFO_EXTENSION
            )
        );

        return preg_match(
            '/^[a-z0-9]{1,10}$/',
            $extension
        )
            ? $extension
            : 'bin';
    }

    private function uploadErrorMessage(int $error): string
    {
        return match ($error) {
            UPLOAD_ERR_INI_SIZE,
            UPLOAD_ERR_FORM_SIZE =>
            'Файлът надвишава позволения размер за качване.',

            UPLOAD_ERR_PARTIAL =>
            'Файлът беше качен само частично.',

            UPLOAD_ERR_NO_FILE =>
            'Необходимо е да изпратите файл.',

            UPLOAD_ERR_NO_TMP_DIR =>
            'Липсва временна директория на сървъра.',

            UPLOAD_ERR_CANT_WRITE =>
            'Файлът не можа да бъде записан на сървъра.',

            UPLOAD_ERR_EXTENSION =>
            'Качването беше прекъснато от PHP разширение.',

            default =>
            'Файлът не беше качен успешно.',
        };
    }

    private static function serializeUser(
        ?User $user
    ): ?array {
        if (!$user) {
            return null;
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'username' => $user->username,
            'profile_image' => $user->profile_image_url,
            'is_active' => (bool) $user->is_active,
        ];
    }

    private function authenticatedUser(): ?User
    {
        $authorization = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

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

    private function jsonInput(): array
    {
        $input = json_decode(
            file_get_contents('php://input'),
            true
        );

        return is_array($input) ? $input : [];
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

    private function conversationNotFound()
    {
        return $this->json([
            'success' => false,
            'message' =>
                'Разговорът не е намерен или нямате достъп до него.',
        ], 404);
    }
}