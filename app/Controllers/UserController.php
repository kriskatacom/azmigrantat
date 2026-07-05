<?php

namespace App\Controllers;

use App\Controllers\HandleExceptions;
use App\Core\Auth;
use App\Core\Session;
use App\Helpers\AuthHelper;
use App\Models\SessionModel;
use App\Models\User;
use App\Services\EmailService;
use App\Services\MediaService;
use App\Services\UserService;
use App\Traits\HasAdminTrait;
use Illuminate\Database\Capsule\Manager;
use Illuminate\Support\Facades\Validator;

class UserController extends BaseController
{
    use HasAdminTrait;

    protected UserService $userService;
    protected MediaService $mediaService;

    public function __construct()
    {
        $this->userService = new UserService();
        $this->mediaService = new MediaService();
    }

    public function index()
    {
        return $this->resourceIndex(User::class, 'admin/users/index', [
            'title' => 'Управление на потребители',
            'resource_name' => 'users',
            'search_fields' => ['name', 'email'],
            'order_by' => 'created_at',
            'order_dir' => 'desc',
            'columns' => ['name', 'client_id', 'redirect_uri', 'is_active', 'created_at']
        ]);
    }

    public function create()
    {
        $this->renderWithLayout(
            'admin/users/form',
            ['title' => 'Създаване на потребител'],
            ['user' => new User()]
        );
    }

    public function registerForm()
    {
        $this->renderWithSeo('users/register/index', [
            'title' => 'Регистрация',
        ]);
    }

    #[HandleExceptions]
    public function register()
    {
        $this->validateSpam();

        $rules = [
            'name' => 'required|min:3',
            'email' => 'required|email',
            'password' => 'required|min:6',
            'confirm_password' => 'required|same:password',
        ];

        $messages = [
            'name.required' => 'Моля, въведете вашето име.',
            'name.min' => 'Името трябва да е поне 3 символа.',
            'email.required' => 'Имейл адресът е задължителен.',
            'email.email' => 'Моля, въведете валиден имейл.',
            'password.required' => 'Паролата е задължителна.',
            'password.min' => 'Паролата трябва да е поне 6 символа.',
            'confirm_password.same' => 'Паролите не съвпадат.',
            'confirm_password.required' => 'Моля, потвърдете паролата.'
        ];

        $validator = Validator::make($_POST, $rules, $messages);

        if ($validator->fails()) {
            Session::setOld($_POST);
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $validatedData = $validator->validated();

        [$user, $isFirstUser] = $this->userService->register($validatedData + [
            'username' => $_POST['username'] ?? null
        ]);

        Session::set('user_id', $user->id);
        Session::set('user_role', $user->role);
        Session::set('user_name', $user->name);

        $welcomeMessage = $isFirstUser
            ? 'Регистрацията е успешна! Вие сте администратор.'
            : 'Добре дошли! Регистрацията премина успешно.';

        $this->flash('success', $welcomeMessage);
        $this->redirect('/users/login');
    }

    public function verifyEmail()
    {
        $token = $_GET['token'] ?? null;
        $user = User::where('verification_token', $token)->first();

        if ($user) {
            $user->email_verified = true;
            $user->verification_token = null;
            $user->save();

            $this->flash('success', 'Имейлът ви е потвърден успешно!');
            return $this->redirect('/users/login');
        }

        $this->flash('error', 'Невалиден или изтекъл токен.');
        return $this->redirect('/users/login');
    }

    public function loginForm()
    {
        $this->renderWithSeo('users/login/index', [
            'title' => 'Вход в профила',
            'description' => 'Влезте в своя профил, за да управлявате настройките си.',
            'keywords' => 'вход, логин, потребителски панел'
        ]);
    }

    #[HandleExceptions]
    public function authenticate()
    {
        $this->validateSpam();

        $rules = [
            'email' => 'required|email',
            'password' => 'required'
        ];

        $messages = [
            'email.required' => 'Моля, въведете вашия имейл.',
            'email.email' => 'Въведеният имейл не е валиден.',
            'password.required' => 'Моля, въведете вашата парола.'
        ];

        $validator = Validator::make($_POST, $rules, $messages);

        if ($validator->fails()) {
            Session::setOld(['email' => $_POST['email'] ?? '']);
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $user = $this->userService->authenticate(
            $_POST['email'],
            $_POST['password']
        );

        if (!$user) {
            $this->flash('error', 'Грешни данни за вход.');
            return $this->redirectBack();
        }

        Manager::table('sessions')
            ->where('last_activity', '<', time() - 86400)
            ->delete();

        Manager::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', session_id())
            ->delete();

        $otherSession = Manager::table('sessions')
            ->where('user_id', $user->id)
            ->where('id', '!=', session_id())
            ->orderBy('last_activity', 'desc')
            ->first();

        if ($otherSession) {
            $userAgent = $otherSession->user_agent ?? 'Неизвестен браузър';
            $ipAddress = $otherSession->ip_address ?? 'Неизвестно IP';
            $lastSeen = date('H:i:s d.m.Y', $otherSession->last_activity);

            $options = $user->options ?? [];
            $messages = $options['messages'] ?? [];

            $messages[] = [
                'type' => 'warning',
                'text' => "Внимание: Засечена е паралелна активност във вашия профил.",
                'details' => [
                    'ip' => $ipAddress,
                    'device' => $userAgent,
                    'time' => $lastSeen,
                    'session_id' => substr($otherSession->id, 0, 8) . '...'
                ],
                'full_info' => "Нова сесия от IP: {$ipAddress} ({$userAgent}) на {$lastSeen}.",
                'read' => false,
                'created_at' => time()
            ];

            $options['messages'] = $messages;
            $user->options = $options;
            $user->save();
        }

        Session::set('user', $user);
        Session::csrfToken();

        $redirectTo = $_POST['return_to'] ?? null;

        if ($redirectTo) {
            return $this->redirect($redirectTo);
        }

        if ($user->role === User::ROLE_ADMIN) {
            return $this->redirect('/admin/dashboard');
        }

        $this->redirect('/users/profile');
    }

    public function logout()
    {
        $this->flash('info', 'Успешно излязохте от профила си.');
        $this->userService->logout();
        $this->redirect('/users/login');
    }

    public function profile()
    {
        $userId = AuthHelper::id();

        if (!$userId) {
            return $this->redirect('/users/login');
        }

        $user = $this->userService->findUser($userId);

        $seoData = [
            'title' => 'Моят профил',
            'description' => 'Управлявайте личните си данни и настройки на профила.',
        ];

        $this->renderWithLayout('users/profile/index', $seoData, [
            'user' => $user
        ], 'admin');
    }

    #[HandleExceptions]
    public function store()
    {
        $fields = [
            'email' => FILTER_VALIDATE_EMAIL,
            'name' => FILTER_DEFAULT,
            'password' => FILTER_DEFAULT,
            'role' => FILTER_DEFAULT
        ];

        $validatedData = $this->validateRequest($fields);

        if (!$validatedData) {
            $this->flash('error', 'Всички полета са задължителни.');
            return $this->redirectBack();
        }

        $this->userService->register($validatedData + [
            'username' => $_POST['username'] ?? null,
            'role' => $_POST['role'] ?? 'user',
            'password' => $_POST['password'],
        ]);

        $this->flash('success', 'Потребителят беше добавен успешно!');
        $this->redirect('/admin/users');
    }

    #[HandleExceptions]
    public function profileUpdate()
    {
        $userId = AuthHelper::id();
        $data = $_POST;

        if (!$userId) {
            return $this->redirect('/users/login');
        }

        $user = $this->userService->findUser($userId);

        if (!empty($data['password'])) {
            $data['password_hash'] = $data['password'];
        }

        unset($data['password'], $data['password_confirmation'], $data['is_active']);

        $user->update($data);

        $this->redirect('/users/profile');
    }

    #[HandleExceptions]
    public function update($id = null)
    {
        $targetId = $id ?? Auth::id();

        if ($id === null) {
            $this->validateSpam();
        }

        $user = User::findOrFail($targetId);

        $rules = [
            'name' => 'required|min:3',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'password' => 'nullable|min:6|confirmed',
            'options.gender' => 'nullable|in:male,female,other',
        ];

        $messages = [
            'name.required' => 'Името е задължително.',
            'email.required' => 'Имейлът е задължителен.',
            'email.unique' => 'Този имейл вече се използва от друг потребител.',
            'password.min' => 'Новата парола трябва да е поне 6 символа.',
            'password.confirmed' => 'Паролите не съвпадат.',
        ];

        $validator = Validator::make($_POST, $rules, $messages);

        if ($validator->fails()) {
            Session::setOld($_POST);
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        if ($this->userService->canChangeStatus($user)) {
            $this->userService->updateIsActive($user->id);
        }

        $data = $_POST;

        if (!empty($data['password'])) {
            $data['password_hash'] = $data['password'];
        }

        unset($data['password'], $data['password_confirmation'], $data['is_active']);

        if (isset($data['options']) && is_array($data['options'])) {
            $data['options'] = json_encode($data['options'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        } else {
            $data['options'] = json_encode([], JSON_UNESCAPED_SLASHES);
        }

        $user->update($data);

        $this->flash('success', 'Профилът е обновен успешно!');
        $this->redirectBack();
    }

    #[HandleExceptions]
    public function edit($id)
    {
        $user = $this->userService->findUser((int) $id);

        $user->options = is_string($user->options) ? json_decode($user->options, true) : ($user->options ?? []);

        $seoData = [
            'title' => "Редактиране на {$user->name} | Админ панел",
            'description' => 'Промяна на потребителски данни и роли.'
        ];

        $this->renderWithLayout('admin/users/form', $seoData, [
            'user' => $user
        ]);
    }

    #[HandleExceptions]
    public function destroy($id)
    {
        $this->userService->deleteUser((int) $id, (int) Auth::id());
        $this->flash('success', 'Потребителят беше преместен в кошчето.');
        $this->redirect('/admin/users');
    }

    public function restore($id)
    {
        $user = User::onlyTrashed()->findOrFail((int) $id);
        $user->restore();

        $user->is_active = 0;
        $user->save();

        $this->flash('success', 'Потребителят беше възстановен успешно като деактивиран.');
        return $this->redirect("/admin/users?tab=trash");
    }

    public function forceDelete($id)
    {
        $user = User::onlyTrashed()->findOrFail((int) $id);

        $user->forceDelete();
        $this->flash('info', 'Потребителят беше изтрит завинаги.');
        return $this->redirect("/admin/users?tab=trash");
    }

    #[HandleExceptions]
    public function updateIsActive($id)
    {
        $this->userService->updateIsActive($id);
        $this->redirectBack();
    }

    public function showForgotPassword()
    {
        $this->renderWithSeo('users/forgot-password/index', [
            'title' => 'Забравена парола',
            'description' => 'Въведете своя имейл адрес, за да получите линк за възстановяване на паролата.',
            'keywords' => 'забравена парола, възстановяване, профил'
        ]);
    }

    public function showResetPassword()
    {
        $token = $_GET['token'] ?? null;

        if (!$token) {
            $this->flash('error', 'Невалидна или липсваща връзка за възстановяване на паролата.');
            return $this->redirect('/users/login');
        }

        $user = User::where('reset_token', $token)->first();

        if (!$user) {
            $this->flash('error', 'Връзката за възстановяване на паролата е невалидна или е изтекла.');
            return $this->redirect('/users/forgot-password');
        }

        $this->renderWithSeo('users/reset-password/index', [
            'title' => 'Създаване на нова парола',
            'description' => 'Въведете своята нова сигурна парола.',
        ], [
            'token' => $token
        ]);
    }

    #[HandleExceptions]
    public function resetPassword()
    {
        $this->validateSpam();

        $rules = [
            'token' => 'required',
            'password' => 'required|min:6',
            'confirm_password' => 'required|same:password',
        ];

        $messages = [
            'token.required' => 'Липсва валиден токен за възстановяване.',
            'password.required' => 'Моля, въведете нова парола.',
            'password.min' => 'Новата парола трябва да е поне 6 символа.',
            'confirm_password.required' => 'Моля, потвърдете новата парола.',
            'confirm_password.same' => 'Паролите не съвпадат.'
        ];

        $validator = Validator::make($_POST, $rules, $messages);

        if ($validator->fails()) {
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $user = User::where('reset_token', $_POST['token'])->first();

        if (!$user) {
            $this->flash('error', 'Връзката за възстановяване е невалидна или е изтекла.');
            return $this->redirect('/users/forgot-password');
        }

        $user->password_hash = $_POST['password'];
        $user->reset_token = null;
        $user->save();

        $this->flash('success', 'Паролата ви беше променена успешно! Вече можете да влезете.');
        return $this->redirect('/users/login');
    }

    #[HandleExceptions]
    public function forgotPassword()
    {
        $this->validateSpam();

        $rules = [
            'email' => 'required|email'
        ];

        $messages = [
            'email.required' => 'Моля, въведете вашия имейл.',
            'email.email' => 'Въведеният имейл не е валиден.'
        ];

        $validator = Validator::make($_POST, $rules, $messages);

        if ($validator->fails()) {
            Session::setOld(['email' => $_POST['email'] ?? '']);
            $this->flash('error', $validator->errors()->first());
            return $this->redirectBack();
        }

        $user = User::where('email', $_POST['email'])->first();

        if ($user) {
            $token = bin2hex(random_bytes(32));
            $user->reset_token = $token;
            $user->save();

            $resetUrl = BASE_URL . "/users/reset-password?token={$token}";

            EmailService::send(
                $user->email,
                'Възстановяване на парола',
                'forgot-password-link',
                [
                    'name' => $user->name,
                    'resetUrl' => $resetUrl,
                    'siteUrl' => FULL_DOMAIN,
                    'phone' => COMPANY_PHONE,
                    'companyName' => COMPANY_NAME,
                ]
            );
        }

        $this->flash('success', 'Ако имейл адресът съществува в системата, ще получите инструкции за възстановяване.');
        return $this->redirect('/users/login');
    }
}