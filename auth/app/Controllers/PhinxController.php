<?php

namespace App\Controllers;

use Phinx\Config\Config;
use Phinx\Migration\Manager;
use Symfony\Component\Console\Input\StringInput;
use Symfony\Component\Console\Output\BufferedOutput;

class PhinxController extends BaseController
{
    public function migrate()
    {
        $inputPassword = $_GET['password'] ?? '';
        $envPassword = $_ENV['MIGRATION_PASSWORD'] ?? $_ENV['APP_KEY'] ?? null;

        if (empty($envPassword) || $inputPassword !== $envPassword) {
            http_response_code(403);
            echo "Достъпът е отказан: Невалидна парола.";
            return;
        }

        try {
            $phinxConfigPath = dirname(__DIR__, 2) . '/phinx.php';

            if (!file_exists($phinxConfigPath)) {
                throw new \Exception("Файлът phinx.php не е намерен на адрес: " . $phinxConfigPath);
            }

            $configArray = require $phinxConfigPath;
            $config = new Config($configArray);

            $input = new StringInput('');
            $output = new BufferedOutput();

            $manager = new Manager($config, $input, $output);
            $manager->migrate('development');

            echo "<pre>";
            echo "Миграциите бяха изпълнени успешно:\n\n";
            echo $output->fetch();
            echo "</pre>";

        } catch (\Exception $e) {
            http_response_code(500);
            echo "Грешка при изпълнение на миграциите: " . $e->getMessage();
        }
    }
}
