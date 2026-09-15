<?php

namespace App\Services;

use App\Models\Video;
use Carbon\Carbon;
use Illuminate\Database\Capsule\Manager as Capsule;

final class VideoViewService
{
    public function record(Video $video, int $userId): Video
    {
        Capsule::connection()->transaction(function () use ($video, $userId): void {
            $now = Carbon::now();
            $inserted = Capsule::table('video_views')->insertOrIgnore([
                'video_id' => (int) $video->id,
                'user_id' => $userId,
                'view_count' => 1,
                'first_viewed_at' => $now,
                'last_viewed_at' => $now,
            ]);

            if ($inserted === 0) {
                Capsule::table('video_views')
                    ->where('video_id', (int) $video->id)
                    ->where('user_id', $userId)
                    ->update([
                        'view_count' => Capsule::raw('view_count + 1'),
                        'last_viewed_at' => $now,
                    ]);
            }

            Video::query()->whereKey($video->id)->increment('total_views');
            if ($inserted === 1) {
                Video::query()->whereKey($video->id)->increment('unique_viewers');
            }
        });

        return $video->refresh();
    }
}
