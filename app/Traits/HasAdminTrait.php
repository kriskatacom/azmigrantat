<?php

namespace App\Traits;

trait HasAdminTrait
{
    protected function resourceIndex($modelClass, string $view, array $config = [])
    {
        if ($modelClass instanceof \Illuminate\Database\Eloquent\Builder) {
            $query = $modelClass;
            $modelClass = get_class($query->getModel());
        } else {
            $query = $modelClass::query();
        }

        $currentTab = $_GET['tab'] ?? 'all';

        if (!empty($config['with'])) {
            $query->with($config['with']);
        }

        switch ($currentTab) {
            case 'trash':
                $query->onlyTrashed();
                break;
            case 'active':
                $query->where('is_active', true);
                break;
            case 'inactive':
                $query->where('is_active', false);
                break;
            case 'published':
            case 'draft':
            case 'scheduled':
                $query->where('status', $currentTab);
                break;
        }

        if (in_array('hierarchical', $config['features'] ?? []) && empty($_GET['search']) && $currentTab !== 'trash') {
            $query->whereNull('parent_id');
        }

        if (isset($config['order_by'])) {
            $query->orderBy($config['order_by'], $config['order_dir'] ?? 'asc');
        } else {
            $query->latest();
        }

        $items = $this->paginateQuery($query, $config['search_fields'] ?? ['title']);

        $counts = [
            'all' => $modelClass::count(),
            'trash' => $modelClass::onlyTrashed()->count()
        ];

        if (in_array('status', $config['features'] ?? [])) {
            $counts['published'] = $modelClass::where('status', 'published')->count();
            $counts['draft'] = $modelClass::where('status', 'draft')->count();
            $counts['scheduled'] = $modelClass::where('status', 'scheduled')->count();
        }

        return $this->renderWithLayout($view, [
            'title' => $config['title'] ?? 'Управление'
        ], [
            $config['resource_name'] => $items,
            'currentTab' => $currentTab,
            'counts' => $counts
        ]);
    }
}