<?php

use App\Controllers\Api\BlockController;
use App\Controllers\Api\CallController;
use App\Controllers\Api\TurnCredentialsController;
use App\Controllers\Api\ConversationController;
use App\Controllers\Api\TotpController;
use App\Controllers\Api\InternalMobileController;
use App\Controllers\Api\LinkPreviewController;
use App\Controllers\Api\LiveController;
use App\Controllers\Api\MessageController;
use App\Controllers\Api\EmailLoginController;
use App\Controllers\Api\DeviceAuthController;
use App\Controllers\Api\MobileAuthController;
use App\Controllers\Api\NotificationController;
use App\Controllers\Api\PaymentMethodController;
use App\Controllers\Api\PhoneVerificationController;
use App\Controllers\Api\PushTokenController;
use App\Controllers\Api\TwoFAuthController;
use App\Controllers\CategoryController;
use App\Controllers\PhinxController;
use App\Controllers\PostController;
use App\Core\Router;

use App\Controllers\Api\UserController;
use App\Controllers\IndexController;
use App\Controllers\OauthController;

use App\Middlewares\AuthMiddleware;
use App\Middlewares\BearerAuthMiddleware;

$router = new Router();

$router->get('/migrations/migrate', [PhinxController::class, 'migrate']);

require_once __DIR__ . '/core.php';

$router->get('/admin/categories', [CategoryController::class, 'index']);
$router->get('/admin/categories/create', [CategoryController::class, 'create']);
$router->post('/admin/categories/store', [CategoryController::class, 'store']);
$router->get('/admin/categories/edit/{id}', [CategoryController::class, 'edit']);
$router->post('/admin/categories/update/{id}', [CategoryController::class, 'update']);
$router->post('/admin/categories/toggle-active/{id}', [CategoryController::class, 'toggleActive']);
$router->post('/admin/categories/destroy/{id}', [CategoryController::class, 'destroy']);
$router->post('/admin/categories/restore/{id}', [CategoryController::class, 'restore']);

$router->get('/admin/posts', [PostController::class, 'index'], [AuthMiddleware::class]);
$router->get('/admin/posts/create', [PostController::class, 'create'], [AuthMiddleware::class]);
$router->post('/admin/posts/store', [PostController::class, 'store'], [AuthMiddleware::class]);
$router->get('/admin/posts/edit/{id}', [PostController::class, 'edit'], [AuthMiddleware::class]);
$router->post('/admin/posts/update/{id}', [PostController::class, 'update'], [AuthMiddleware::class]);
$router->post('/admin/posts/delete/{id}', [PostController::class, 'delete'], [AuthMiddleware::class]);
$router->post('/admin/posts/restore/{id}', [PostController::class, 'restore'], [AuthMiddleware::class]);
$router->post('/admin/posts/force-delete/{id}', [PostController::class, 'forceDelete'], [AuthMiddleware::class]);

$router->get('/oauth/authorize', [OauthController::class, 'authorize']);
$router->get('/api/user/me', [OauthController::class, 'me'], [BearerAuthMiddleware::class]);

$router->post('/oauth/approve', [OauthController::class, 'approve'], [AuthMiddleware::class]);
$router->post('/oauth/token', [OauthController::class, 'token']);

$router->get('/verify-email', [App\Controllers\UserController::class, 'verifyEmail']);

$router->post('/api/2fa/send', [TwoFAuthController::class, 'send2faCode'], [AuthMiddleware::class]);
$router->post('/api/2fa/verify', [TwoFAuthController::class, 'verify2faCode'], [AuthMiddleware::class]);

$router->post('/api/mobile/login', [MobileAuthController::class, 'login']);
$router->post('/api/mobile/register', [MobileAuthController::class, 'register']);
$router->post('/api/mobile/logout', [MobileAuthController::class, 'logout'], [BearerAuthMiddleware::class]);
$router->get('/api/mobile/me', [MobileAuthController::class, 'me'], [BearerAuthMiddleware::class]);

$router->post('/api/mobile/auth/google', [MobileAuthController::class, 'google']);
$router->post('/api/mobile/refresh', [MobileAuthController::class, 'refresh']);
$router->post('/api/mobile/password/forgot', [MobileAuthController::class, 'forgotPassword']);
$router->post('/api/mobile/password/reset', [MobileAuthController::class, 'resetPassword']);
$router->post('/api/mobile/login/totp', [TotpController::class, 'completeLogin']);
$router->post('/api/mobile/login/email', [EmailLoginController::class, 'completeLogin']);
$router->post('/api/mobile/login/email/resend', [EmailLoginController::class, 'resend']);
$router->post('/api/mobile/login/options', [DeviceAuthController::class, 'options']);
$router->post('/api/mobile/login/pin', [DeviceAuthController::class, 'loginPin']);
$router->post('/api/mobile/login/device', [DeviceAuthController::class, 'loginDevice']);
$router->post('/api/mobile/device/pending/status', [DeviceAuthController::class, 'pendingStatus']);
$router->post('/api/mobile/device/pending/complete', [DeviceAuthController::class, 'completePending']);
$router->post('/api/mobile/device/pending/email', [DeviceAuthController::class, 'sendEmailCode']);
$router->post('/api/mobile/device/pending/email/verify', [DeviceAuthController::class, 'verifyEmailCode']);
$router->get('/api/mobile/device/pending', [DeviceAuthController::class, 'listPending'], [BearerAuthMiddleware::class]);
$router->post('/api/mobile/device/pending/approve', [DeviceAuthController::class, 'approve'], [BearerAuthMiddleware::class]);
$router->post('/api/mobile/device/pin', [DeviceAuthController::class, 'setPin'], [BearerAuthMiddleware::class]);
$router->post('/api/mobile/device/pin/enabled', [DeviceAuthController::class, 'setPinLoginEnabled'], [BearerAuthMiddleware::class]);
$router->post('/api/mobile/device/email-login/enabled', [EmailLoginController::class, 'setEnabled'], [BearerAuthMiddleware::class]);
$router->post('/api/mobile/device/pin/clear', [DeviceAuthController::class, 'clearPin'], [BearerAuthMiddleware::class]);

$bearer = [BearerAuthMiddleware::class];

$router->get('/api/mobile/users', [UserController::class, 'search'], $bearer);
$router->get('/api/mobile/users/{id}', [UserController::class, 'show'], $bearer);
$router->post('/api/mobile/profile', [UserController::class, 'updateProfile'], $bearer);
$router->post('/api/mobile/profile/privacy', [UserController::class, 'updatePrivacy'], $bearer);
$router->post('/api/mobile/profile/image', [UserController::class, 'updateProfileImage'], $bearer);
$router->post('/api/mobile/profile/cover', [UserController::class, 'updateCoverImage'], $bearer);
$router->post('/api/mobile/profile/password', [UserController::class, 'updatePassword'], $bearer);
$router->get('/api/mobile/blocks', [BlockController::class, 'index'], $bearer);
$router->post('/api/mobile/blocks', [BlockController::class, 'store'], $bearer);
$router->post('/api/mobile/blocks/{id}/unblock', [BlockController::class, 'destroy'], $bearer);
$router->get('/api/mobile/payment-methods', [PaymentMethodController::class, 'index'], $bearer);
$router->post('/api/mobile/payment-methods', [PaymentMethodController::class, 'store'], $bearer);
$router->post('/api/mobile/payment-methods/settings', [PaymentMethodController::class, 'updateSettings'], $bearer);
$router->post('/api/mobile/payment-methods/{id}/default', [PaymentMethodController::class, 'setDefault'], $bearer);
$router->post('/api/mobile/payment-methods/{id}/delete', [PaymentMethodController::class, 'destroy'], $bearer);
$router->get('/api/mobile/totp', [TotpController::class, 'status'], $bearer);
$router->post('/api/mobile/totp/start', [TotpController::class, 'start'], $bearer);
$router->post('/api/mobile/totp/confirm', [TotpController::class, 'confirm'], $bearer);
$router->post('/api/mobile/totp/disable', [TotpController::class, 'disable'], $bearer);
$router->post('/api/mobile/phone/send', [PhoneVerificationController::class, 'send'], $bearer);
$router->post('/api/mobile/phone/verify', [PhoneVerificationController::class, 'verify'], $bearer);
$router->get('/api/mobile/link-preview', [LinkPreviewController::class, 'show'], $bearer);

$router->get('/api/mobile/conversations', [ConversationController::class, 'index'], $bearer);
$router->post('/api/mobile/conversations/direct', [ConversationController::class, 'createDirect'], $bearer);
$router->get('/api/mobile/conversations/unread-count', [ConversationController::class, 'unreadCount'], $bearer);
$router->delete('/api/mobile/profile/chat-messages', [UserController::class, 'deleteChatMessages'], $bearer);
$router->post('/api/mobile/profile/delete', [UserController::class, 'deleteAccount'], $bearer);
$router->post('/api/mobile/conversations/{id}/clear', [ConversationController::class, 'clear'], $bearer);
$router->get('/api/mobile/conversations/{id}', [ConversationController::class, 'show'], $bearer);
$router->get('/api/mobile/conversations/{id}/messages', [MessageController::class, 'index'], $bearer);
$router->get('/api/mobile/conversations/{id}/messages/{messageId}', [MessageController::class, 'show'], $bearer);
$router->post('/api/mobile/conversations/{id}/messages', [MessageController::class, 'store'], $bearer);
$router->post('/api/mobile/conversations/{id}/attachments', [MessageController::class, 'storeAttachment'], $bearer);
$router->post('/api/mobile/conversations/{id}/read', [MessageController::class, 'markAsRead'], $bearer);
$router->post('/api/mobile/conversations/{id}/delivered', [MessageController::class, 'markAsDelivered'], $bearer);
$router->post('/api/mobile/conversations/{id}/messages/{messageId}/reactions', [MessageController::class, 'react'], $bearer);

$router->post('/api/mobile/push-tokens', [PushTokenController::class, 'store'], $bearer);
$router->delete('/api/mobile/push-tokens', [PushTokenController::class, 'destroy'], $bearer);
$router->post('/api/mobile/push-tokens/delete', [PushTokenController::class, 'destroy'], $bearer);
$router->post('/api/mobile/push-tokens/delete-all',[PushTokenController::class, 'destroyAll'], $bearer);
$router->post('/api/mobile/calls/{call_id}/action', [CallController::class, 'action'], $bearer);
$router->get('/api/mobile/turn-credentials', [TurnCredentialsController::class, 'show'], $bearer);

$router->get('/api/mobile/lives', [LiveController::class, 'index'], $bearer);
$router->post('/api/mobile/lives', [LiveController::class, 'store'], $bearer);
$router->get('/api/mobile/lives/{id}', [LiveController::class, 'show'], $bearer);
$router->post('/api/mobile/lives/{id}/start', [LiveController::class, 'start'], $bearer);
$router->post('/api/mobile/lives/{id}/end', [LiveController::class, 'end'], $bearer);
$router->post('/api/mobile/lives/{id}/join', [LiveController::class, 'join'], $bearer);
$router->post('/api/mobile/lives/{id}/leave', [LiveController::class, 'leave'], $bearer);
$router->get('/api/mobile/lives/{id}/comments', [LiveController::class, 'comments'], $bearer);
$router->post('/api/mobile/lives/{id}/comments', [LiveController::class, 'storeComment'], $bearer);

$router->get('/api/mobile/notifications/unread-count', [NotificationController::class, 'unreadCount'], $bearer);
$router->get('/api/mobile/notifications/{id}', [NotificationController::class, 'show'], $bearer);
$router->get('/api/mobile/notifications', [NotificationController::class, 'index'], $bearer);
$router->post('/api/mobile/notifications/read-all', [NotificationController::class, 'markAllAsRead'], $bearer);
$router->post('/api/mobile/notifications/delete-all', [NotificationController::class, 'deleteAll'], $bearer);
$router->post('/api/mobile/notifications/{id}/read', [NotificationController::class, 'markAsRead'], $bearer);
$router->post('/api/mobile/notifications/{id}/delete', [NotificationController::class, 'destroy'], $bearer);

$router->get('/internal/mobile/push-tokens', [InternalMobileController::class, 'pushTokens']);
$router->post('/internal/mobile/push-tokens/deactivate', [InternalMobileController::class, 'deactivatePushToken']);
$router->post('/internal/mobile/calls/authorize', [InternalMobileController::class, 'authorizeCall']);
$router->post('/internal/mobile/conversations/typing', [InternalMobileController::class, 'authorizeTyping']);
$router->post('/internal/mobile/lives/authorize', [InternalMobileController::class, 'authorizeLive']);
$router->post('/internal/mobile/lives/comments', [InternalMobileController::class, 'storeLiveComment']);
$router->post('/internal/mobile/lives/viewer-count', [InternalMobileController::class, 'syncLiveViewerCount']);
$router->post('/internal/mobile/notifications/missed-video-call', [InternalMobileController::class, 'missedVideoCall']);
$router->post('/internal/mobile/calls/log', [InternalMobileController::class, 'recordCallLog']);
$router->post('/internal/mobile/notifications', [InternalMobileController::class, 'createNotification']);

$router->get('/api/users', [UserController::class, 'getUsers']);
$router->get('/api/users/account', [UserController::class, 'getAccount']);
$router->get('/api/posts', [PostController::class, 'getPosts']);
$router->get('/api/posts/user/{id}', [PostController::class, 'getUserPosts']);
$router->get('/api/posts/{id}', [PostController::class, 'getPost']);
$router->get('/api/categories', [CategoryController::class, 'getCategories']);

$router->get('/', [IndexController::class, 'home']);

return $router;
