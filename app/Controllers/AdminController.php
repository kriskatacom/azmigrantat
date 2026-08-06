<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Session;
use App\Models\User;

class AdminController extends BaseController
{
    public function __construct()
    {
        if (!Auth::isAdmin()) {
            $this->redirect('/');
        }
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
        ], 400);
    }

    public function dashboard()
    {
        $stats = User::getDashboardStats();

        $seoData = [
            'title'       => 'Табло за управление',
            'description' => 'Бърз преглед на статистиката и съдържанието.',
        ];

        $this->renderWithLayout('admin/dashboard/index', $seoData, [
            'stats' => $stats,
        ]);
    }
}