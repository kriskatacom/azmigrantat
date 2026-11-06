<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Models\ContentReport;

final class ModerationController extends BaseController
{
    public function index()
    {
        $status = trim((string) ($_GET['status'] ?? 'pending'));
        if (!in_array($status, ['pending', 'reviewing', 'resolved', 'rejected', 'all'], true)) $status = 'pending';
        $query = ContentReport::query()->with(['reporter', 'reportedUser', 'reviewer'])->latest('id');
        if ($status !== 'all') $query->where('status', $status);

        $this->renderWithLayout('admin/moderation/index', ['title' => 'Модерация'], [
            'reports' => $query->limit(200)->get(),
            'selectedStatus' => $status,
        ]);
    }

    public function update($id)
    {
        $this->validateSpam();
        $report = ContentReport::find((int) $id);
        if (!$report) return $this->redirect('/admin/moderation');
        $status = trim((string) ($_POST['status'] ?? ''));
        if (!in_array($status, ['reviewing', 'resolved', 'rejected'], true)) return $this->redirect('/admin/moderation');

        $report->status = $status;
        $report->active_key = in_array($status, ['pending', 'reviewing'], true)
            ? $report->active_key
            : null;
        $report->moderator_notes = trim((string) ($_POST['moderator_notes'] ?? '')) ?: null;
        $report->reviewed_by = Auth::id();
        $report->reviewed_at = date('Y-m-d H:i:s');
        $report->save();
        $this->flash('success', 'Сигналът е обновен.');
        return $this->redirect('/admin/moderation');
    }
}
