<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\Message;
use App\Models\MessageReaction;
use App\Models\Notification;
use App\Models\User;
use App\Services\BackblazeB2Service;
use App\Services\BlockService;
use App\Services\ConversationService;
use App\Services\NotificationService;
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
    private NotificationService $notificationService;
    private BlockService $blockService;

    public function __construct()
    {
        $this->conversationService = new ConversationService();
        $this->realtimeNotifier = new RealtimeNotifier();
        $this->pushNotificationService = new PushNotificationService();
        $this->notificationService = new NotificationService();
        $this->blockService = new BlockService();
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

        if ($this->blockService->isBlockedByOtherInConversation($conversation, (int) $user->id)) {
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
                    self::serializeMessage($message, (int) $user->id)
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

        if ($this->blockService->isBlockedInConversation($conversation, (int) $user->id)) {
            return $this->blockedConversation();
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
                'data' => self::serializeMessage($message, (int) $user->id),
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

    public function markAsDelivered($conversationId)
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

        $result = $this->conversationService
            ->markConversationAsDelivered(
                $conversation,
                $user,
                $messageId
            );

        if (!$result) {
            return $this->json([
                'success' => false,
                'message' => 'Съобщението не е намерено.',
            ], 404);
        }

        if ((int) $result['updated'] > 0) {
            $this->realtimeNotifier->notifyMessageDelivered(
                $conversation,
                (int) $user->id,
                (int) $result['message']->id,
                $result['delivered_at']->toISOString()
            );
        }

        return $this->json([
            'success' => true,
            'message' =>
                'Съобщенията са отбелязани като получени.',
            'last_delivered_message_id' => $result['message']->id,
        ]);
    }

    public function react($conversationId, $messageId)
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

        if ($this->blockService->isBlockedInConversation($conversation, (int) $user->id)) {
            return $this->blockedConversation();
        }

        $input = $this->jsonInput();
        $type = trim((string) ($input['type'] ?? ''));

        if (!MessageReaction::isValidType($type)) {
            return $this->json([
                'success' => false,
                'message' => 'Невалидна реакция.',
            ], 422);
        }

        $result = $this->conversationService->toggleMessageReaction(
            $conversation,
            $user,
            (int) $messageId,
            $type
        );

        if (!$result) {
            return $this->json([
                'success' => false,
                'message' => 'Съобщението не е намерено.',
            ], 404);
        }

        $this->realtimeNotifier->notifyMessageReaction(
            $conversation,
            (int) $user->id,
            (int) $result['message']->id,
            $result['type'],
            $result['items']
        );

        $this->notifyMessageOwnerOfReaction(
            $result['message'],
            $user,
            $result['type']
        );

        return $this->json([
            'success' => true,
            'data' => [
                'message_id' => (int) $result['message']->id,
                'type' => $result['type'],
                'reactions' => MessageReaction::summarize(
                    $result['message']->reactions,
                    (int) $user->id
                ),
            ],
        ]);
    }

    public static function serializeMessage(
        Message $message,
        ?int $currentUserId = null
    ): array {
        $message->loadMissing('reactions');
        $summary = MessageReaction::summarize(
            $message->reactions ?? collect(),
            $currentUserId
        );

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
            'is_read' => $message->status === Message::STATUS_READ,
            'delivered_at' =>
                $message->delivered_at?->toISOString(),
            'read_at' =>
                $message->read_at?->toISOString(),
            'edited_at' =>
                $message->edited_at?->toISOString(),
            'created_at' =>
                $message->created_at?->toISOString(),
            'mine_reaction' => $summary['mine'],
            'reactions' => $summary['items'],
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

        if ($this->blockService->isBlockedInConversation($conversation, (int) $user->id)) {
            return $this->blockedConversation();
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

        if (!in_array($type, ['image', 'audio', 'file'], true)) {
            return $this->json([
                'success' => false,
                'message' => 'Невалиден тип на файла.',
                'errors' => [
                    'type' => [
                        'Типът трябва да бъде image, audio или file.',
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
                'data' => self::serializeMessage($message, (int) $user->id),
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

            'audio/mp4' => 'm4a',
            'audio/x-m4a' => 'm4a',
            'audio/aac' => 'aac',
            'audio/mpeg' => 'mp3',
            'audio/webm' => 'webm',

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

    private function notifyMessageOwnerOfReaction(
        Message $message,
        User $reactor,
        ?string $reactionType
    ): void {
        if ($reactionType === null || !MessageReaction::isValidType($reactionType)) {
            return;
        }

        $recipientId = (int) $message->sender_id;
        $reactorId = (int) $reactor->id;

        if ($recipientId <= 0 || $recipientId === $reactorId) {
            return;
        }

        $recipient = User::query()->find($recipientId);

        if (!$recipient) {
            return;
        }

        $emoji = MessageReaction::emoji($reactionType);
        $actorImage = $reactor->profile_image_url ?? null;

        try {
            $result = $this->notificationService->recordMessageReaction(
                $recipientId,
                $reactorId,
                (int) $message->conversation_id,
                (int) $message->id,
                $reactionType,
                $emoji,
                (string) $reactor->name,
                is_string($actorImage) ? $actorImage : null
            );
        } catch (Exception $exception) {
            error_log('Reaction notification error: ' . $exception->getMessage());
            return;
        }

        $payload = $this->notificationService->serialize($result['notification']);

        if (!$payload) {
            return;
        }

        $event = $result['created'] ? 'notification:new' : 'notification:updated';

        try {
            $this->realtimeNotifier->notifyNotification(
                $recipientId,
                $payload,
                $event
            );
        } catch (Exception $exception) {
            error_log('Reaction realtime notification error: ' . $exception->getMessage());
        }

        try {
            $this->pushNotificationService->sendToUser(
                $recipient,
                (string) ($payload['title'] ?: $reactor->name),
                (string) ($payload['message'] ?: 'Имате нова реакция.'),
                [
                    'type' => Notification::TYPE_MESSAGE_REACTION,
                    'notification_id' => (string) $payload['id'],
                    'conversation_id' => (int) $message->conversation_id,
                    'message_id' => (int) $message->id,
                    'sender_id' => $reactorId,
                    'reaction_type' => $reactionType,
                ],
                is_string($actorImage) && $actorImage !== '' ? $actorImage : null,
                'chat_message',
                'receive_message.wav'
            );
        } catch (Exception $exception) {
            error_log('Reaction push notification error: ' . $exception->getMessage());
        }
    }

    private static function serializeUser(
        ?User $user
    ): ?array {
        if (!$user) {
            return null;
        }

        return $user->toChatUserArray();
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

    private function blockedConversation()
    {
        return $this->json([
            'success' => false,
            'message' => 'Не можете да пишете на блокиран потребител.',
        ], 403);
    }
}