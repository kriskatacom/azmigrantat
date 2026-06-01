<?php

namespace App\Controllers;

use App\Controllers\BaseController;
use App\Models\Menu;
use App\Core\Session;
use App\Models\MenuItem;
use App\Models\Page;
use App\Modules\Form;
use App\Modules\Str;
use App\Traits\HasAdminTrait;
use Exception;

class MenuController extends BaseController
{
    use HasAdminTrait;

    public function index()
    {
        return $this->resourceIndex(Menu::class, 'admin/menus/index', [
            'title'         => 'Управление на менюта | Админ панел',
            'resource_name' => 'menus',
            'search_fields' => ['title', 'slug', 'description'],
            'order_by'      => 'created_at',
            'order_dir'     => 'desc'
        ]);
    }

    public function create()
    {
        $seoData = [
            'title' => 'Ново меню | Админ панел',
            'description' => 'Създаване на ново меню.'
        ];

        $this->renderWithLayout('admin/menus/form', $seoData, [
            'menu' => new Menu(),
        ]);
    }

    #[HandleExceptions]
    public function store()
    {
        $fields = [
            'title'       => FILTER_DEFAULT,
            'slug'        => FILTER_DEFAULT,
        ];

        $validatedData = $this->validateRequest($fields);

        if (!$validatedData) {
            Session::setOld($_POST);
            $this->flash('error', 'Моля, попълнете всички задължителни полета.');
            return $this->redirectBack();
        }

        if (empty($validatedData['slug'])) {
            $validatedData['slug'] = Str::slug($validatedData['title']);
        }

        $menu = Menu::create($validatedData);

        $this->flash('success', 'Менюто беше създадено успешно!');
        $this->redirect("/admin/menus/edit/{$menu->id}");
    }

    public function edit($id)
    {
        $menu = Menu::find((int)$id);

        if (!$menu) {
            $this->flash('error', 'Менюто не е намерено.');
            $this->redirect('/admin/menus');
        }

        $seoData = [
            'title' => 'Редактиране на меню: ' . $menu->title,
        ];

        $this->renderWithLayout('admin/menus/form', $seoData, [
            'menu' => $menu
        ]);
    }

    public function update($id)
    {
        try {
            $menu = Menu::findOrFail((int)$id);

            $data = [
                'title'       => $_POST['title'] ?? '',
                'slug'        => $_POST['slug'] ?? Str::slug($_POST['title']),
                'description' => $_POST['description'] ?? '',
                'updated_at'  => date('Y-m-d H:i:s.v')
            ];

            $existing = Menu::where('slug', $data['slug'])
                ->where('id', '!=', $id)
                ->first();

            if ($existing) {
                throw new Exception("Слъгът '{$data['slug']}' вече се използва от друго меню.");
            }

            $menu->update($data);

            $this->flash('success', 'Промените бяха запазени успешно!');
            $this->redirect("/admin/menus/edit/{$id}");
        } catch (Exception $e) {
            Session::setOld($_POST);
            $this->flash('error', 'Грешка при обновяване: ' . $e->getMessage());
            $this->redirect("/admin/menus/edit/{$id}");
        }
    }

    public function delete($id)
    {
        try {
            $menu = Menu::findOrFail((int)$id);

            $menu->delete();

            $this->flash('info', 'Менюто беше преместено в кошчето.');
        } catch (Exception $e) {
            $this->flash('error', 'Грешка при изтриване: ' . $e->getMessage());
        }

        $this->redirect('/admin/menus');
    }

    public function restore($id)
    {
        try {
            $menu = Menu::onlyTrashed()->findOrFail((int)$id);
            $menu->restore();

            $this->flash('info', 'Менюто беше възстановено успешно!');
        } catch (\Exception $e) {
            $this->flash('error', 'Грешка при възстановяване.');
        }

        $remainingTrashCount = Menu::onlyTrashed()->count();

        if ($remainingTrashCount === 0) {
            return $this->redirect('/admin/menus?tab=all');
        }

        return $this->redirect('/admin/menus?tab=trash');
    }

    public function forceDelete($id)
    {
        $menu = Menu::onlyTrashed()->findOrFail($id);

        $menu->forceDelete();

        $this->flash('info', 'Менюто беше изтрито завинаги от системата.');

        $remainingTrashCount = Menu::onlyTrashed()->count();

        if ($remainingTrashCount === 0) {
            $this->redirect('/admin/menus');
        }

        $this->redirect('/admin/menu?tab=trash');
    }

    public function structure($id)
    {
        $menu = Menu::findOrFail((int)$id);

        $parentOptions = Form::getTreeOptions(
            Page::class,
            [],
            'title',
            'Изберете страница'
        );

        $items = MenuItem::where('menu_id', $menu->id)
            ->whereNull('parent_id')
            ->orderBy('order_index', 'asc')
            ->with('children')
            ->get();

        $editItem = null;
        if (isset($_GET['edit'])) {
            $editItem = MenuItem::find((int)$_GET['edit']);
        }

        $seoData = [
            'title' => 'Структура на ' . $menu->title . ' | Админ панел',
        ];

        $this->renderWithLayout('admin/menus/structure', $seoData, [
            'menu'      => $menu,
            'items'     => $items,
            'pages'     => $parentOptions,
            'editItem'  => $editItem
        ]);
    }

    public function updateItem()
    {
        try {
            $id = isset($_POST['id']) ? (int)$_POST['id'] : 0;
            $item = MenuItem::findOrFail($id);

            $data = [
                'title'   => $_POST['title'] ?? '',
                'target'      => $_POST['target'] ?? '_self',
                'page_id' => !empty($_POST['page_id']) ? (int)$_POST['page_id'] : null,
                'url'     => $_POST['url'] ?? null,
                'updated_at' => date('Y-m-d H:i:s.v')
            ];

            if (empty($data['title']) && empty($data['page_id'])) {
                throw new \Exception("Трябва да въведете заглавие или да изберете страница.");
            }

            if (empty($data['title']) && $data['page_id']) {
                $page = Page::find($data['page_id']);
                if ($page) {
                    $data['title'] = $page->title;
                }
            }

            $item->update($data);

            $this->flash('success', 'Елементът беше обновен успешно!');
        } catch (\Exception $e) {
            $this->flash('error', 'Грешка при редакцията: ' . $e->getMessage());
        }

        $menuId = $item->menu_id ?? 0;
        $this->redirect("/admin/menus/structure/{$menuId}");
    }

    public function addItem($menuId)
    {
        try {
            $menu = Menu::findOrFail((int)$menuId);

            $maxOrder = MenuItem::where('menu_id', $menu->id)
                ->whereNull('parent_id')
                ->max('order_index') ?? -1;

            $data = [
                'menu_id'     => $menu->id,
                'title'       => $_POST['title'] ?? '',
                'page_id'     => !empty($_POST['page_id']) ? (int)$_POST['page_id'] : null,
                'url'         => $_POST['url'] ?? null,
                'target'      => $_POST['target'] ?? '_self',
                'parent_id'   => null,
                'order_index' => $maxOrder + 1,
                'is_active'   => true,
                'created_at'  => date('Y-m-d H:i:s.v')
            ];

            if (empty($data['title']) && empty($data['page_id'])) {
                throw new \Exception("Трябва да въведете заглавие или да изберете страница.");
            }

            if (empty($data['title']) && $data['page_id']) {
                $page = Page::find($data['page_id']);
                $data['title'] = $page->title;
            }

            MenuItem::create($data);

            $this->flash('success', 'Елементът беше добавен успешно!');
        } catch (\Exception $e) {
            $this->flash('error', 'Грешка: ' . $e->getMessage());
        }

        $this->redirect("/admin/menus/structure/{$menuId}");
    }

    public function deleteItem($itemId)
    {
        try {
            $item = MenuItem::findOrFail((int)$itemId);
            $menuId = $item->menu_id;

            $item->delete();

            $this->flash('info', 'Елементът беше премахнат.');
            $this->redirect("/admin/menus/structure/{$menuId}");
        } catch (\Exception $e) {
            $this->flash('error', 'Грешка при изтриване.');
            $this->redirect('/admin/menus');
        }
    }

    public function reorderItems()
    {
        $data = json_decode(file_get_contents('php://input'), true);

        if (isset($data['items'])) {
            $this->saveHierarchy($data['items'], null);
            echo json_encode(['success' => true]);
            exit;
        }
    }

    private function saveHierarchy($items, $parentId)
    {
        foreach ($items as $index => $node) {
            MenuItem::where('id', $node['id'])->update([
                'parent_id' => $parentId,
                'order_index' => $index
            ]);

            if (isset($node['children'])) {
                $this->saveHierarchy($node['children'], $node['id']);
            }
        }
    }
}
