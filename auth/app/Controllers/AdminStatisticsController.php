<?php

namespace App\Controllers;

use App\Models\Video;
use Carbon\Carbon;
use Illuminate\Database\Capsule\Manager as Capsule;

class AdminStatisticsController extends BaseController
{
    public function index()
    {
        $readyVideos = Video::query()->where('status', Video::STATUS_READY);
        $totalViews = (int) (clone $readyVideos)->sum('total_views');
        $videoCount = (int) (clone $readyVideos)->count();

        $stats = [
            'video_count' => $videoCount,
            'total_views' => $totalViews,
            'unique_viewers' => (int) Capsule::table('video_views')
                ->join('videos', 'videos.id', '=', 'video_views.video_id')
                ->where('videos.status', Video::STATUS_READY)
                ->distinct()
                ->count('video_views.user_id'),
            'creators' => (int) (clone $readyVideos)->distinct('user_id')->count('user_id'),
            'average_views' => $videoCount > 0 ? round($totalViews / $videoCount, 1) : 0,
        ];

        $topVideos = Capsule::table('videos')
            ->leftJoin('users', 'users.id', '=', 'videos.user_id')
            ->where('videos.status', Video::STATUS_READY)
            ->select([
                'videos.id',
                'videos.title',
                'videos.total_views',
                'videos.unique_viewers',
                'users.name as creator_name',
            ])
            ->orderByDesc('videos.total_views')
            ->orderByDesc('videos.id')
            ->limit(10)
            ->get();

        $dailyViews = Capsule::table('video_views')
            ->join('videos', 'videos.id', '=', 'video_views.video_id')
            ->where('videos.status', Video::STATUS_READY)
            ->where('video_views.last_viewed_at', '>=', Carbon::now()->subDays(29)->startOfDay())
            ->selectRaw('DATE(video_views.last_viewed_at) AS day, SUM(video_views.view_count) AS views, COUNT(DISTINCT video_views.user_id) AS viewers')
            ->groupBy('day')
            ->orderBy('day')
            ->get();

        $maxDailyViews = max(1, (int) $dailyViews->max('views'));

        $this->renderWithLayout('admin/statistics/index', [
            'title' => 'Статистика',
            'description' => 'Статистика на видеосъдържанието и гледанията.',
        ], [
            'stats' => $stats,
            'topVideos' => $topVideos,
            'dailyViews' => $dailyViews,
            'maxDailyViews' => $maxDailyViews,
        ]);
    }
}
