<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\Video;
use App\Models\VideoComment;
use App\Models\VideoCommentLike;
use Carbon\Carbon;
use Illuminate\Database\Capsule\Manager as DB;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Validator;

final class VideoCommentController extends BaseController
{
    public function index($videoId)
    {
        $viewer = $this->authenticatedUser();
        if (!$viewer) return $this->unauthorized();

        $video = $this->readyVideo((int) $videoId);
        if (!$video) return $this->notFound();

        $limit = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
        $beforeId = max(0, (int) ($_GET['before_id'] ?? 0));
        $query = VideoComment::query()
            ->with(['user', 'video'])
            ->where('video_id', (int) $video->id)
            ->whereNull('parent_id')
            ->where(function ($comments): void {
                $comments
                    ->where('status', VideoComment::STATUS_ACTIVE)
                    ->orWhere('replies_count', '>', 0);
            })
            ->when($beforeId > 0, fn ($comments) => $comments->where('id', '<', $beforeId))
            ->latest('id')
            ->limit($limit + 1)
            ->get();

        return $this->page($query, $limit, (int) $viewer->id, 'before');
    }

    public function replies($commentId)
    {
        $viewer = $this->authenticatedUser();
        if (!$viewer) return $this->unauthorized();

        $comment = VideoComment::query()->whereKey((int) $commentId)->first();
        if (!$comment || !$this->readyVideo((int) $comment->video_id)) return $this->notFound();

        $rootId = (int) ($comment->root_id ?: $comment->id);
        $limit = min(50, max(1, (int) ($_GET['limit'] ?? 20)));
        $afterId = max(0, (int) ($_GET['after_id'] ?? 0));
        $query = VideoComment::query()
            ->with(['user', 'video', 'parent.user'])
            ->where('video_id', (int) $comment->video_id)
            ->where('root_id', $rootId)
            ->where('status', VideoComment::STATUS_ACTIVE)
            ->when($afterId > 0, fn ($comments) => $comments->where('id', '>', $afterId))
            ->oldest('id')
            ->limit($limit + 1)
            ->get();

        return $this->page($query, $limit, (int) $viewer->id, 'after');
    }

    public function store($videoId)
    {
        $viewer = $this->authenticatedUser();
        if (!$viewer) return $this->unauthorized();

        $video = $this->readyVideo((int) $videoId);
        if (!$video) return $this->notFound();

        $input = $this->jsonInput();
        $validator = Validator::make($input, [
            'body' => 'required|string|max:1000',
            'parent_id' => ['nullable', 'regex:/^[1-9][0-9]{0,19}$/'],
        ], [], ['body' => 'коментар', 'parent_id' => 'родителски коментар']);
        if ($validator->fails()) {
            return $this->json(['success' => false, 'message' => $validator->errors()->first()], 422);
        }

        $body = trim((string) $input['body']);
        if ($body === '') {
            return $this->json(['success' => false, 'message' => 'Коментарът не може да бъде празен.'], 422);
        }

        $recentCount = VideoComment::query()
            ->where('user_id', (int) $viewer->id)
            ->where('created_at', '>=', Carbon::now()->subMinute())
            ->count();
        if ($recentCount >= 20) {
            return $this->json(['success' => false, 'message' => 'Пишете твърде бързо. Опитайте отново след малко.'], 429);
        }

        try {
            $comment = DB::connection()->transaction(function () use ($input, $body, $video, $viewer): VideoComment {
                $parent = null;
                $rootId = null;
                if (!empty($input['parent_id'])) {
                    $parent = VideoComment::query()
                        ->whereKey((int) $input['parent_id'])
                        ->lockForUpdate()
                        ->first();
                    if (
                        !$parent
                        || (int) $parent->video_id !== (int) $video->id
                        || $parent->status !== VideoComment::STATUS_ACTIVE
                    ) {
                        throw new \DomainException('Коментарът, на който отговаряте, вече не е наличен.');
                    }
                    $rootId = (int) ($parent->root_id ?: $parent->id);
                }

                $comment = VideoComment::query()->create([
                    'video_id' => (int) $video->id,
                    'user_id' => (int) $viewer->id,
                    'parent_id' => $parent ? (int) $parent->id : null,
                    'root_id' => $rootId,
                    'body' => $body,
                    'status' => VideoComment::STATUS_ACTIVE,
                ]);

                Video::query()->whereKey((int) $video->id)->increment('comments_count');
                if ($rootId) {
                    VideoComment::query()->whereKey($rootId)->increment('replies_count');
                }

                return $comment;
            });
        } catch (\DomainException $exception) {
            return $this->json(['success' => false, 'message' => $exception->getMessage()], 409);
        }

        $comment->load(['user', 'video', 'parent.user']);
        return $this->json([
            'success' => true,
            'data' => $this->serialize($comment, (int) $viewer->id, false),
        ], 201);
    }

    public function like($commentId)
    {
        $viewer = $this->authenticatedUser();
        if (!$viewer) return $this->unauthorized();

        $comment = VideoComment::query()->whereKey((int) $commentId)->first();
        if (!$comment || $comment->status !== VideoComment::STATUS_ACTIVE || !$this->readyVideo((int) $comment->video_id)) {
            return $this->notFound();
        }

        try {
            DB::connection()->transaction(function () use ($comment, $viewer): void {
                $created = VideoCommentLike::query()->firstOrCreate(
                    ['comment_id' => (int) $comment->id, 'user_id' => (int) $viewer->id],
                    ['created_at' => Carbon::now()],
                );
                if ($created->wasRecentlyCreated) {
                    VideoComment::query()->whereKey((int) $comment->id)->increment('likes_count');
                }
            });
        } catch (QueryException $exception) {
            if ($exception->getCode() !== '23000') throw $exception;
        }

        $comment->refresh()->load(['user', 'video', 'parent.user']);
        return $this->json(['success' => true, 'data' => $this->serialize($comment, (int) $viewer->id, true)]);
    }

    public function unlike($commentId)
    {
        $viewer = $this->authenticatedUser();
        if (!$viewer) return $this->unauthorized();

        $comment = VideoComment::query()->whereKey((int) $commentId)->first();
        if (!$comment || !$this->readyVideo((int) $comment->video_id)) return $this->notFound();

        DB::connection()->transaction(function () use ($comment, $viewer): void {
            $deleted = VideoCommentLike::query()
                ->where('comment_id', (int) $comment->id)
                ->where('user_id', (int) $viewer->id)
                ->delete();
            if ($deleted > 0) {
                VideoComment::query()
                    ->whereKey((int) $comment->id)
                    ->where('likes_count', '>', 0)
                    ->decrement('likes_count');
            }
        });

        $comment->refresh()->load(['user', 'video', 'parent.user']);
        return $this->json(['success' => true, 'data' => $this->serialize($comment, (int) $viewer->id, false)]);
    }

    public function destroy($commentId)
    {
        $viewer = $this->authenticatedUser();
        if (!$viewer) return $this->unauthorized();

        $comment = VideoComment::query()->with('video')->whereKey((int) $commentId)->first();
        if (!$comment || !$comment->video) return $this->notFound();
        if ((int) $comment->user_id !== (int) $viewer->id && (int) $comment->video->user_id !== (int) $viewer->id) {
            return $this->json(['success' => false, 'message' => 'Нямате право да изтриете този коментар.'], 403);
        }

        DB::connection()->transaction(function () use ($comment): void {
            $locked = VideoComment::query()->whereKey((int) $comment->id)->lockForUpdate()->first();
            if (!$locked || $locked->status === VideoComment::STATUS_DELETED) return;

            $locked->body = null;
            $locked->status = VideoComment::STATUS_DELETED;
            $locked->save();
            Video::query()
                ->whereKey((int) $locked->video_id)
                ->where('comments_count', '>', 0)
                ->decrement('comments_count');
            if ($locked->root_id) {
                VideoComment::query()
                    ->whereKey((int) $locked->root_id)
                    ->where('replies_count', '>', 0)
                    ->decrement('replies_count');
            }
        });

        $comment->refresh()->load(['user', 'video', 'parent.user']);
        return $this->json(['success' => true, 'data' => $this->serialize($comment, (int) $viewer->id, false)]);
    }

    private function page($comments, int $limit, int $viewerId, string $direction)
    {
        $hasMore = $comments->count() > $limit;
        $items = $comments->take($limit)->values();
        $likedIds = VideoCommentLike::query()
            ->where('user_id', $viewerId)
            ->whereIn('comment_id', $items->pluck('id')->all())
            ->pluck('comment_id')
            ->map(fn ($id) => (int) $id)
            ->all();
        $liked = array_fill_keys($likedIds, true);
        $lastId = $items->last()?->id;

        return $this->json([
            'success' => true,
            'data' => $items->map(fn (VideoComment $comment) => $this->serialize(
                $comment,
                $viewerId,
                isset($liked[(int) $comment->id]),
            ))->all(),
            'pagination' => [
                'has_more' => $hasMore,
                'next_before_id' => $direction === 'before' && $hasMore ? (int) $lastId : null,
                'next_after_id' => $direction === 'after' && $hasMore ? (int) $lastId : null,
            ],
        ]);
    }

    private function serialize(VideoComment $comment, int $viewerId, bool $likedByMe): array
    {
        $user = $comment->user;
        $parentUser = $comment->relationLoaded('parent') ? $comment->parent?->user : null;

        return [
            'id' => (int) $comment->id,
            'video_id' => (int) $comment->video_id,
            'parent_id' => $comment->parent_id ? (int) $comment->parent_id : null,
            'root_id' => $comment->root_id ? (int) $comment->root_id : null,
            'body' => $comment->status === VideoComment::STATUS_ACTIVE ? $comment->body : null,
            'status' => $comment->status,
            'replies_count' => (int) $comment->replies_count,
            'likes_count' => (int) $comment->likes_count,
            'liked_by_me' => $likedByMe,
            'can_delete' => (int) $comment->user_id === $viewerId
                || (int) ($comment->video?->user_id ?? 0) === $viewerId,
            'created_at' => $comment->created_at?->toIso8601String(),
            'user' => $user ? [
                'id' => (int) $user->id,
                'name' => (string) ($user->name ?: 'Потребител'),
                'profile_image' => $user->profile_image_url,
            ] : null,
            'reply_to_user' => $parentUser ? [
                'id' => (int) $parentUser->id,
                'name' => (string) ($parentUser->name ?: 'Потребител'),
            ] : null,
        ];
    }

    private function readyVideo(int $videoId): ?Video
    {
        return Video::query()->whereKey($videoId)->where('status', Video::STATUS_READY)->first();
    }

    private function jsonInput(): array
    {
        $decoded = json_decode(file_get_contents('php://input') ?: '{}', true);
        return is_array($decoded) ? $decoded : [];
    }

    private function unauthorized()
    {
        return $this->json(['success' => false, 'message' => 'Необходима е автентикация.'], 401);
    }

    private function notFound()
    {
        return $this->json(['success' => false, 'message' => 'Коментарът или видеото не е намерено.'], 404);
    }
}
