<?php

use App\Controllers\Api\BlockController;
use App\Controllers\Api\CallController;
use App\Controllers\Api\ConversationController;
use App\Controllers\Api\InternalMobileController;
use App\Controllers\Api\LinkPreviewController;
use App\Controllers\Api\MessageController;
use App\Controllers\Api\MobileAuthController;
use App\Controllers\Api\NotificationController;
use App\Controllers\Api\PhoneVerificationController;
use App\Controllers\Api\PushTokenController;
use App\Controllers\Api\TwoFAuthController;
use App\Controllers\CategoryController;
use App\Controllers\PhinxController;
use App\Controllers\PostController;
use App\Core\Router;

use App\Controllers\Api\UserController;
use App\Controllers\PageController;
use App\Controllers\OauthController;

use App\Middlewares\AuthMiddleware;

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
$router->get('/api/user/me', [OauthController::class, 'me']);

$router->post('/oauth/approve', [OauthController::class, 'approve'], [AuthMiddleware::class]);
$router->post('/oauth/token', [OauthController::class, 'token']);

$router->get('/verify-email', [App\Controllers\UserController::class, 'verifyEmail']);

$router->post('/api/2fa/send', [TwoFAuthController::class, 'send2faCode'], [AuthMiddleware::class]);
$router->post('/api/2fa/verify', [TwoFAuthController::class, 'verify2faCode'], [AuthMiddleware::class]);

$router->post('/api/mobile/login', [MobileAuthController::class, 'login']);
$router->post('/api/mobile/register', [MobileAuthController::class, 'register']);
$router->post('/api/mobile/logout', [MobileAuthController::class, 'logout']);
$router->get('/api/mobile/me', [MobileAuthController::class, 'me']);

$router->post('/api/mobile/auth/google', [MobileAuthController::class, 'google']);

$router->get('/api/mobile/users', [UserController::class, 'search']);
$router->post('/api/mobile/profile', [UserController::class, 'updateProfile']);
$router->post('/api/mobile/profile/image', [UserController::class, 'updateProfileImage']);
$router->post('/api/mobile/profile/password', [UserController::class, 'updatePassword']);
$router->get('/api/mobile/blocks', [BlockController::class, 'index']);
$router->post('/api/mobile/blocks', [BlockController::class, 'store']);
$router->post('/api/mobile/blocks/{id}/unblock', [BlockController::class, 'destroy']);
$router->post('/api/mobile/phone/send', [PhoneVerificationController::class, 'send']);
$router->post('/api/mobile/phone/verify', [PhoneVerificationController::class, 'verify']);
$router->get('/api/mobile/link-preview', [LinkPreviewController::class, 'show']);

$router->get('/api/mobile/conversations', [ConversationController::class, 'index']);
$router->post('/api/mobile/conversations/direct', [ConversationController::class, 'createDirect']);
$router->get('/api/mobile/conversations/unread-count', [ConversationController::class, 'unreadCount']);
$router->delete('/api/mobile/profile/chat-messages', [UserController::class, 'deleteChatMessages']);
$router->get('/api/mobile/conversations/{id}', [ConversationController::class, 'show']);
$router->get('/api/mobile/conversations/{id}/messages', [MessageController::class, 'index']);
$router->post('/api/mobile/conversations/{id}/messages', [MessageController::class, 'store']);
$router->post('/api/mobile/conversations/{id}/attachments', [MessageController::class, 'storeAttachment']);
$router->post('/api/mobile/conversations/{id}/read', [MessageController::class, 'markAsRead']);
$router->post('/api/mobile/conversations/{id}/delivered', [MessageController::class, 'markAsDelivered']);
$router->post('/api/mobile/conversations/{id}/messages/{messageId}/reactions', [MessageController::class, 'react']);

$router->post('/api/mobile/push-tokens', [PushTokenController::class, 'store']);
$router->delete('/api/mobile/push-tokens', [PushTokenController::class, 'destroy']);
$router->post('/api/mobile/push-tokens/delete', [PushTokenController::class, 'destroy']);
$router->post('/api/mobile/push-tokens/delete-all',[PushTokenController::class, 'destroyAll']);
$router->post('/api/mobile/calls/{call_id}/action', [CallController::class, 'action']);

$router->get('/api/mobile/notifications/unread-count', [NotificationController::class, 'unreadCount']);
$router->get('/api/mobile/notifications/{id}', [NotificationController::class, 'show']);
$router->get('/api/mobile/notifications', [NotificationController::class, 'index']);
$router->post('/api/mobile/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
$router->post('/api/mobile/notifications/delete-all', [NotificationController::class, 'deleteAll']);
$router->post('/api/mobile/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
$router->post('/api/mobile/notifications/{id}/delete', [NotificationController::class, 'destroy']);

$router->get('/internal/mobile/push-tokens', [InternalMobileController::class, 'pushTokens']);
$router->post('/internal/mobile/push-tokens/deactivate', [InternalMobileController::class, 'deactivatePushToken']);
$router->post('/internal/mobile/calls/authorize', [InternalMobileController::class, 'authorizeCall']);
$router->post('/internal/mobile/notifications/missed-video-call', [InternalMobileController::class, 'missedVideoCall']);
$router->post('/internal/mobile/notifications', [InternalMobileController::class, 'createNotification']);

$router->get('/api/users', [UserController::class, 'getUsers']);
$router->get('/api/users/account', [UserController::class, 'getAccount']);
$router->get('/api/posts', [PostController::class, 'getPosts']);
$router->get('/api/posts/user/{id}', [PostController::class, 'getUserPosts']);
$router->get('/api/posts/{id}', [PostController::class, 'getPost']);
$router->get('/api/categories', [CategoryController::class, 'getCategories']);

$router->get('/', [PageController::class, 'azmigrantat']);
$router->get('/{slug*}', [PageController::class, 'show']);

return $router;
