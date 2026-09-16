<?php

namespace App\Controllers;

use App\Core\View;

class DevController
{
    public function showStructure()
    {
        $root = BASE_PATH;
        $dirIterator = new \RecursiveDirectoryIterator($root, \RecursiveDirectoryIterator::SKIP_DOTS);
        $iter = new \RecursiveIteratorIterator($dirIterator, \RecursiveIteratorIterator::SELF_FIRST);

        $structure = [];
        foreach ($iter as $path) {
            $relative = str_replace($root . DIRECTORY_SEPARATOR, '', $path->getPathname());

            if (str_contains($relative, 'vendor') || str_contains($relative, '.git')) continue;

            $structure[] = [
                'relative' => $relative,
                'is_dir'   => is_dir($path->getPathname()),
                'extension' => pathinfo($relative, PATHINFO_EXTENSION)
            ];
        }

        return View::render('admin/dev/structure', [
            'structure' => $structure,
            'root' => $root
        ]);
    }
}
