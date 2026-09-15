<?php

namespace App\Controllers;

use App\Core\Session;

class AdminController extends BaseController
{
    public function __construct()
    {
    }

    public function sidebarToggle()
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (isset($data['sidebarOpen'])) {
            $isOpen = (bool)$data['sidebarOpen'];

            Session::set('sidebar_open', $isOpen);

            return $this->json([
                'success' => true,
                'sidebarOpen' => $isOpen
            ]);
        }

        return $this->json([
            'success' => false,
            'message' => 'Липсва стойност за sidebarOpen'
        ]);
    }

    public function dashboard()
    {
        $this->renderAdmin('admin/dashboard/index', ['title' => 'Табло']);
    }
}
