<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\ContentReport;
use App\Models\User;
use App\Models\Video;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Validator;

final class ReportController extends BaseController
{
    public function store()
    {
        $reporter = $this->authenticatedUser();
        if (!$reporter) return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);

        $input = json_decode(file_get_contents('php://input'), true);
        $input = is_array($input) ? $input : [];
        $validator = Validator::make($input, [
            'target_type' => 'required|in:user,video',
            'target_id' => ['required', 'regex:/^[1-9][0-9]{0,19}$/'],
            'reason' => 'required|in:spam,harassment,hate,sexual,violence,scam,privacy,other',
            'details' => 'nullable|string|max:1000',
        ]);
        if ($validator->fails()) return $this->json(['success' => false, 'message' => $validator->errors()->first()], 422);

        $targetType = (string) $input['target_type'];
        $targetId = (string) $input['target_id'];
        $reportedUserId = $targetType === 'user'
            ? User::query()->whereKey($targetId)->value('id')
            : Video::query()->whereKey($targetId)->value('user_id');

        if (!$reportedUserId) return $this->json(['success' => false, 'message' => 'Съдържанието не е намерено.'], 404);
        if ((int) $reportedUserId === (int) $reporter->id) return $this->json(['success' => false, 'message' => 'Не можете да докладвате собствен профил или съдържание.'], 422);

        $duplicate = ContentReport::query()
            ->where('reporter_id', $reporter->id)
            ->where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->whereIn('status', ['pending', 'reviewing'])
            ->exists();
        if ($duplicate) return $this->json(['success' => false, 'message' => 'Този сигнал вече е изпратен за преглед.'], 409);

        try {
            $report = ContentReport::create([
                'reporter_id' => $reporter->id,
                'reported_user_id' => $reportedUserId,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'reason' => $input['reason'],
                'details' => trim((string) ($input['details'] ?? '')) ?: null,
                'status' => 'pending',
                'active_key' => hash('sha256', $reporter->id . '|' . $targetType . '|' . $targetId),
            ]);
        } catch (QueryException $exception) {
            if ($exception->getCode() === '23000') {
                return $this->json(['success' => false, 'message' => 'Този сигнал вече е изпратен за преглед.'], 409);
            }

            throw $exception;
        }

        return $this->json(['success' => true, 'message' => 'Сигналът е изпратен за преглед.', 'data' => ['id' => (int) $report->id]], 201);
    }
}
