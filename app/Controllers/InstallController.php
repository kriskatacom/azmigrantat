<?php

namespace App\Controllers;

use App\Core\Redirect;
use App\Core\Session;
use App\Models\Category;
use Phinx\Console\PhinxApplication;
use Symfony\Component\Console\Input\StringInput;
use Symfony\Component\Console\Output\BufferedOutput;
use App\Models\User;
use App\Models\Page;
use App\Models\Menu;
use App\Models\MenuItem;
use Illuminate\Database\Capsule\Manager;

class InstallController
{
    private string $adminEmail = DATABASE_ADMIN_EMAIL;
    private string $adminPassword = DATABASE_ADMIN_PASSWORD;

    public function index()
    {
        return view('install/index', ['layout' => 'install']);
    }

    public function run()
    {
        $host = $_ENV['DB_HOST'] ?? 'localhost';
        $name = $_ENV['DB_NAME'] ?? '';
        $user = $_ENV['DB_USER'] ?? '';
        $pass = $_ENV['DB_PASS'] ?? '';

        try {
            $pdo = new \PDO("mysql:host=$host;charset=utf8mb4", $user, $pass);
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("USE `$name`");

            $configPath = str_replace('\\', '/', BASE_PATH . '/phinx.php');

            if (!file_exists($configPath)) {
                throw new \Exception("Конфигурационният файл на Phinx не е намерен на: " . $configPath);
            }

            $phinxApp = new PhinxApplication();
            $phinxApp->setAutoExit(false);
            $output = new BufferedOutput();
            $input = new StringInput("migrate -c '$configPath'");

            $exitCode = $phinxApp->doRun($input, $output);
            $log = $output->fetch();

            if ($exitCode !== 0 || (strpos($log, 'All Done') === false && strpos($log, 'no migrations') === false)) {
                throw new \Exception("Phinx грешка: " . $log);
            }

            $capsule = new Manager();
            $capsule->addConnection([
                'driver'    => 'mysql',
                'host'      => $host,
                'database'  => $name,
                'username'  => $user,
                'password'  => $pass,
                'charset'   => 'utf8mb4',
                'collation' => 'utf8mb4_unicode_ci',
            ]);
            $capsule->setAsGlobal();
            $capsule->bootEloquent();

            $this->seedData();

            Session::set('install_success_info', [
                'database' => $name,
                'admin_user' => $this->adminEmail,
                'admin_pass' => $this->adminPassword
            ]);

            return Redirect::to('/install/success');
        } catch (\Exception $e) {
            die("Критична грешка при инсталация: " . $e->getMessage());
        }
    }

    private function seedData()
    {
        User::create([
            'email'         => $this->adminEmail,
            'username'      => 'admin',
            'password_hash' => $this->adminPassword,
            'name'          => 'Administrator',
            'role'          => 'admin',
            'is_active'     => 1
        ]);

        $page = Page::create([
            'title'     => 'Начало',
            'slug'      => '/home',
            'content'   => '<h1>Добре дошли!</h1><p>Системата е инсталирана успешно.</p>',
            'template'  => 'none',
            'view_name' => 'home',
            'is_active' => 1
        ]);

        $menu = Menu::create([
            'title' => 'Main Menu',
            'slug'  => 'main-menu'
        ]);

        MenuItem::create([
            'menu_id'     => $menu->id,
            'page_id'     => $page->id,
            'title'       => 'Начало',
            'url'         => '/',
            'order_index' => 1,
            'is_active'   => 1
        ]);
    }

    public function success()
    {
        if (!Session::has('install_success_info')) {
            return Redirect::to('/');
        }

        $data = Session::get('install_success_info');

        return view('install/success', [
            'info'   => $data,
            'title'  => 'Инсталацията завършена',
            'layout' => 'install'
        ]);
    }
}