<?php

namespace App\Controllers;

use App\Controllers\HandleExceptions;
use App\Core\Auth;
use App\Core\Session;
use App\Models\SessionModel;
use App\Models\User;
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
        $currentTab = $_GET['tab'] ?? 'all';
        $search = $_GET['search'] ?? '';

        $users = null;
        $sessions = null;

        if ($currentTab === 'sessions') {
            $sessions = SessionModel::with('user')
                ->whereNotNull('user_id')
                ->when($search, function ($query, $search) {
                    return $query->whereHas('user', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
                })
                ->orderBy('last_activity', 'desc')
                ->get();
        } else {
            $query = User::query();

            if ($currentTab === 'inactive') {
                $query->where('is_active', false);
            } elseif ($currentTab === 'active') {
                $query->where('is_active', true);
            }

            $users = $this->paginateQuery($query, ['name', 'email', 'username']);
        }

        $seoData = [
            'title' => 'Управление на потребители | Админ панел',
            'description' => 'Списък и редактиране на потребители.'
        ];

        $this->renderAdmin('admin/users/index', $seoData, [
            'users'      => $users,
            'sessions'   => $sessions,
            'currentTab' => $currentTab,
            'search'     => $search
        ]);
    }

    public function create()
    {
        $this->renderAdmin(
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
            'name'             => 'required|min:3',
            'email'            => 'required|email',
            'password'         => 'required|min:6',
            'confirm_password' => 'required|same:password',
        ];

        $messages = [
            'name.required'             => 'Моля, въведете вашето име.',
            'name.min'                  => 'Името трябва да е поне 3 символа.',
            'email.required'            => 'Имейл адресът е задължителен.',
            'email.email'               => 'Моля, въведете валиден имейл.',
            'password.required'         => 'Паролата е задължителна.',
            'password.min'              => 'Паролата трябва да е поне 6 символа.',
            'confirm_password.same'     => 'Паролите не съвпадат.',
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
        $this->redirect('/users/profile');
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
            'email'    => 'required|email',
            'password' => 'required'
        ];

        $messages = [
            'email.required'    => 'Моля, въведете вашия имейл.',
            'email.email'       => 'Въведеният имейл не е валиден.',
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

        Session::set('user_id', $user->id);
        Session::set('user_role', $user->role);
        Session::set('user_name', $user->name);

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
        $user = $this->userService->getCurrentUser();

        $this->renderWithSeo('users/profile/index', [
            'title' => 'Моят профил',
            'description' => 'Управлявайте личните си данни и настройки на профила.',
        ], ['user' => $user]);
    }

    #[HandleExceptions]
    public function store()
    {
        $fields = [
            'email'    => FILTER_VALIDATE_EMAIL,
            'name'     => FILTER_DEFAULT,
            'password' => FILTER_DEFAULT,
            'role'     => FILTER_DEFAULT
        ];

        $validatedData = $this->validateRequest($fields);

        if (!$validatedData) {
            $this->flash('error', 'Всички полета са задължителни.');
            return $this->redirectBack();
        }

        $this->userService->register($validatedData + [
            'username' => $_POST['username'] ?? null,
            'role'     => $_POST['role'] ?? 'user',
            'password' => $_POST['password'],
        ]);

        $this->flash('success', 'Потребителят беше добавен успешно!');
        $this->redirect('/admin/users');
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
            'name'     => 'required|min:3',
            'email'    => 'required|email|unique:users,email,' . $user->id,
            'password' => 'nullable|min:6|confirmed',
            'gender'   => 'nullable|in:male,female,other',
        ];

        $messages = [
            'name.required'      => 'Името е задължително.',
            'email.required'     => 'Имейлът е задължителен.',
            'email.unique'       => 'Този имейл вече се използва от друг потребител.',
            'password.min'       => 'Новата парола трябва да е поне 6 символа.',
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

        $this->updateResource($user, $data, ['profile_image']);

        $this->flash('success', 'Профилът е обновен успешно!');
        $this->redirectBack();
    }

    #[HandleExceptions]
    public function edit($id)
    {
        $user = $this->userService->findUser((int)$id);

        $seoData = [
            'title' => "Редактиране на {$user->name} | Админ панел",
            'description' => 'Промяна на потребителски данни и роли.'
        ];

        $this->renderAdmin('admin/users/form', $seoData, [
            'user' => $user
        ]);
    }

    #[HandleExceptions]
    public function destroy($id)
    {
        $this->userService->deleteUser((int)$id, (int)Auth::id());
        $this->flash('success', 'Потребителят беше изтрит успешно.');
        $this->redirect('/admin/users');
    }

    #[HandleExceptions]
    public function updateIsActive($id)
    {
        $this->userService->updateIsActive($id);
        $this->redirectBack();
    }
}
