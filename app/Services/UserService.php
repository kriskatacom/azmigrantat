<?php

namespace App\Services;

use App\Core\Auth;
use App\Core\Session;
use App\Models\User;
use App\Helpers\UserHelper;
use Exception;

class UserService
{
    public function register(array $rawData)
    {
        if (User::withTrashed()->where('email', $rawData['email'])->exists()) {
            Session::setOld($_POST);
            throw new Exception('Този имейл адрес вече е регистриран.');
        }

        $isFirstUser = User::count() === 0;
        $username = UserHelper::generateUsername($rawData['email'], $rawData['username'] ?? null);

        $role = $isFirstUser ? 'admin' : ($rawData['role'] ?? 'user');

        $user = User::create([
            'name' => $rawData['name'],
            'email' => $rawData['email'],
            'username' => $username,
            'password_hash' => $rawData['password'],
            'role' => $role,
            'is_active' => 1,
            'email_verified' => false,
        ]);

        $token = $user->generateVerificationToken();
        $url = DOMAIN . '/verify-email?token=' . $token;

        EmailService::send(
            $user->email,
            'Потвърждение на регистрация',
            'verify-email',
            [
                'name' => $user->name,
                'url' => $url
            ]
        );

        return [$user, $isFirstUser];
    }

    public function authenticate(string $email, string $password)
    {
        $user = User::where('email', $email)->first();

        if (!$user || !password_verify($password, $user->password_hash)) {
            Session::setOld($_POST);
            throw new Exception('Грешен имейл или парола.');
        }

        if (!$user->is_active) {
            Session::setOld($_POST);
            throw new Exception('Вашият профил е деактивиран.');
        }

        if (!$user->email_verified) {
            Session::setOld($_POST);
            throw new Exception('Моля, потвърдете имейла си преди да влезете.');
        }

        $user->update(['last_login' => date('Y-m-d H:i:s.v')]);

        $_SESSION['user_id'] = $user->id;
        $_SESSION['user_role'] = $user->role;
        $_SESSION['user_name'] = $user->name;

        return $user;
    }

    public function updateProfile(int $userId, array $data)
    {
        $user = User::find($userId);
        if (!$user)
            throw new Exception('Потребителят не е намерен.');

        $user->name = $data['name'] ?? $user->name;
        $user->username = $data['username'] ?? $user->username;

        $currentOptions = is_array($user->options) ? $user->options : (json_decode($user->options, true) ?? []);
        $newOptions = $data['options'] ?? [];

        $user->options = array_merge($currentOptions, $newOptions);

        return $user->save();
    }

    public function isLoggedIn(): bool
    {
        return isset($_SESSION['user_id']);
    }

    public function hasRole(string $role): bool
    {
        return isset($_SESSION['user_role']) && $_SESSION['user_role'] === $role;
    }

    public function isAdmin(): bool
    {
        return $this->hasRole('admin');
    }

    public function getCurrentUser(): ?User
    {
        if (!$this->isLoggedIn())
            return null;

        $user = User::find($_SESSION['user_id']);

        if (!$user || !$user->is_active) {
            $this->logout();
            return null;
        }

        return $user;
    }

    public function logout()
    {
        $flash = $_SESSION['_flash'] ?? null;

        $_SESSION = [];

        if ($flash) {
            $_SESSION['_flash'] = $flash;
        }

        if (session_id()) {
            session_destroy();
        }
    }

    public function findUser(int $id): User
    {
        $user = User::withTrashed()->find($id);
        if (!$user) {
            throw new Exception('Потребителят не е намерен.');
        }
        return $user;
    }

    public function adminUpdateUser(int $userId, array $data): bool
    {
        $user = $this->findUser($userId);
        $currentAdminId = (int) ($_SESSION['user_id'] ?? 0);

        if (isset($data['email']) && $data['email'] !== $user->email) {
            if (User::where('email', $data['email'])->where('id', '!=', $userId)->exists()) {
                throw new Exception('Този имейл адрес вече се използва от друг потребител.');
            }
        }

        if ($userId === $currentAdminId) {
            if (isset($data['role']) && $data['role'] !== $user->role) {
                throw new Exception('Не можете да променяте собствената си роля.');
            }
            if (isset($data['is_active']) && (int) $data['is_active'] === User::STATUS_INACTIVE) {
                throw new Exception('Не можете да деактивирате собствения си профил.');
            }
        }

        if (!empty($data['password'])) {
            $user->password_hash = $data['password'];
        }

        $updateData = [
            'name' => $data['name'] ?? $user->name,
            'email' => $data['email'] ?? $user->email,
            'role' => $data['role'] ?? $user->role,
            'username' => $data['username'] ?? $user->username,
            'is_active' => isset($data['is_active']) ? (int) $data['is_active'] : $user->is_active,
            'options' => $data['options'] ?? $user->options,
        ];

        if ($userId === $currentAdminId) {
            $updateData['role'] = $user->role;
            $updateData['is_active'] = User::STATUS_ACTIVE;
        }

        $user->fill($updateData);

        return $user->save();
    }

    public function canChangeStatus($targetUser)
    {
        $currentUserId = (int) Auth::id();

        if (Auth::user()->role !== \App\Models\User::ROLE_ADMIN) {
            return false;
        }

        if ((int) $targetUser->id === $currentUserId) {
            return false;
        }

        if ($targetUser->role === \App\Models\User::ROLE_ADMIN) {
            return false;
        }

        return true;
    }

    public function updateIsActive($id)
    {
        $user = User::findOrFail((int) $id);
        $currentAdminId = (int) ($_SESSION['user_id'] ?? 0);

        if ($user->id === $currentAdminId) {
            throw new Exception('Не можете да променяте собствения си статус на активност! Това би ви изхвърлило от системата.');
        }

        if ($user->role === User::ROLE_ADMIN) {
            throw new Exception("Потребителят '{$user->name}' е администратор. Неговият статус не може да бъде променян от тук.");
        }

        $isActive = (isset($_POST['is_active']) && ($_POST['is_active'] == '1' || $_POST['is_active'] == 'on')) ? 1 : 0;

        if ($user->is_active === $isActive) {
            return;
        }

        $user->is_active = $isActive;
        $user->save();

        $statusText = $isActive ? 'активиран' : 'деактивиран';
        $_SESSION['flash']['success'] = "Профилът на '{$user->name}' беше успешно {$statusText}!";
    }

    public function deleteUser(int $userId, int $currentAdminId): void
    {
        $user = User::findOrFail($userId);

        if ($user->id === $currentAdminId) {
            throw new Exception('Не можете да изтриете собствения си профил!');
        }

        if ($user->role === 'admin') {
            $adminCount = User::where('role', 'admin')->count();
            if ($adminCount <= 1) {
                throw new Exception('Не можете да изтриете последния администратор в системата!');
            }
        }

        $user->delete();
    }
}
