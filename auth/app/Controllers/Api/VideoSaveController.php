<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\Video;
use App\Models\VideoSave;
use Illuminate\Database\QueryException;

final class VideoSaveController extends BaseController
{
    public function index()
    {
        $viewer = $this->authenticatedUser();
        if (!$viewer) return $this->unauthorized();

        $limit = min(100, max(1, (int) ($_GET['limit'] ?? 30)));
        $savedVideos = VideoSave::query()
            ->with('video')
            ->where('user_id', (int) $viewer->id)
            ->whereHas('video', fn ($query) => $query->where('status', Video::STATUS_READY))
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(static function (VideoSave $save): ?array {
                $video = $save->video;
                if (!$video) return null;

                return [
                    'id' => (int) $video->id,
                    'category_id' => $video->category_id !== null ? (int) $video->category_id : null,
                    'place_id' => $video->place_id !== null ? (int) $video->place_id : null,
                    'title' => $video->title,
                    'description' => $video->description,
                    'thumbnail_url' => $video->thumbnail_url,
                    'status' => $video->status,
                    'bunny_status' => $video->bunny_status,
                    'mime_type' => $video->mime_type,
                    'file_size' => $video->file_size,
                    'total_views' => (int) $video->total_views,
                    'unique_viewers' => (int) $video->unique_viewers,
                    'comments_count' => (int) ($video->comments_count ?? 0),
                    'created_at' => $video->created_at?->toIso8601String(),
                ];
            })
            ->filter()
            ->values();

        return $this->json(['success' => true, 'data' => $savedVideos]);
    }

    public function status()
    {
        $viewer = $this->authenticatedUser();
        if (!$viewer) return $this->unauthorized();

        $ids = array_values(array_unique(array_filter(
            array_map('intval', explode(',', (string) ($_GET['video_ids'] ?? ''))),
            fn (int $id): bool => $id > 0,
        )));
        $ids = array_slice($ids, 0, 100);

        if ($ids === []) {
            return $this->json(['success' => true, 'data' => ['video_ids' => []]]);
        }

        $savedIds = VideoSave::query()
            ->where('user_id', (int) $viewer->id)
            ->whereIn('video_id', $ids)
            ->pluck('video_id')
            ->map(fn ($id): int => (int) $id)
            ->values();

        return $this->json(['success' => true, 'data' => ['video_ids' => $savedIds]]);
    }

    public function store($videoId)
    {
        $viewer = $this->authenticatedUser();
        if (!$viewer) return $this->unauthorized();

        $video = Video::query()
            ->whereKey((int) $videoId)
            ->where('status', Video::STATUS_READY)
            ->first();
        if (!$video) return $this->notFound();

        try {
            VideoSave::query()->firstOrCreate([
                'video_id' => (int) $video->id,
                'user_id' => (int) $viewer->id,
            ]);
        } catch (QueryException $exception) {
            if ((string) $exception->getCode() !== '23000') throw $exception;
        }

        return $this->json(['success' => true, 'data' => ['video_id' => (int) $video->id, 'saved' => true]]);
    }

    public function destroy($videoId)
    {
        $viewer = $this->authenticatedUser();
        if (!$viewer) return $this->unauthorized();

        VideoSave::query()
            ->where('video_id', (int) $videoId)
            ->where('user_id', (int) $viewer->id)
            ->delete();

        return $this->json(['success' => true, 'data' => ['video_id' => (int) $videoId, 'saved' => false]]);
    }

    private function unauthorized()
    {
        return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);
    }

    private function notFound()
    {
        return $this->json(['success' => false, 'message' => 'Видеото не е намерено.'], 404);
    }
}
