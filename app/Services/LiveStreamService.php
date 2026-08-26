<?php

namespace App\Services;

use App\Exceptions\LiveNotFoundException;
use App\Exceptions\LivePermissionException;
use App\Exceptions\LiveStateException;
use App\Models\LiveComment;
use App\Models\LiveStream;
use App\Models\LiveViewer;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Database\Eloquent\Collection;
use RuntimeException;
use Throwable;

final class LiveStreamService
{
    public const ACTIONS = ['join', 'leave', 'comment', 'reaction', 'start', 'end'];

    public const REACTION_TYPES = ['like', 'heart', 'fire', 'clap', 'wow'];

    private BlockService $blocks;
    private ?RealtimeNotifier $realtimeNotifier = null;

    public function __construct(?BlockService $blocks = null)
    {
        $this->blocks = $blocks ?? new BlockService();
    }

    public function create(User $user, ?string $title): LiveStream
    {
        $existing = $this->findOpenStreamForUser((int) $user->id);

        if ($existing) {
            $existing->title = $this->normalizeTitle($title) ?? $existing->title;
            $existing->save();
            $existing->loadMissing('owner');

            return $existing;
        }

        $stream = LiveStream::query()->create([
            'user_id' => (int) $user->id,
            'title' => $this->normalizeTitle($title),
            'status' => LiveStream::STATUS_IDLE,
            'media_provider' => LiveStream::MEDIA_PROVIDER_MOCK,
            'viewer_count' => 0,
            'peak_viewer_count' => 0,
        ]);

        $stream->load('owner');

        return $stream;
    }

    public function start(User $user, int $liveId): LiveStream
    {
        $stream = $this->findOwnedStream($liveId, (int) $user->id);

        if ($stream->isLive()) {
            $stream->loadMissing('owner');

            return $stream;
        }

        if (!$stream->isIdle()) {
            throw new LiveStateException('Live предаването вече е приключено.');
        }

        $stream->status = LiveStream::STATUS_LIVE;
        $stream->started_at = Carbon::now();
        $stream->media_provider = LiveStream::MEDIA_PROVIDER_MOCK;
        $stream->media_room_id = $stream->media_room_id ?: ('live-' . $stream->id);
        $stream->save();
        $stream->loadMissing('owner');

        return $stream;
    }

    public function end(User $user, int $liveId): LiveStream
    {
        $stream = $this->findOwnedStream($liveId, (int) $user->id);

        if ($stream->isEnded()) {
            $stream->loadMissing('owner');

            return $stream;
        }

        $now = Carbon::now();

        Capsule::connection()->transaction(function () use ($stream, $now): void {
            $stream->status = LiveStream::STATUS_ENDED;
            $stream->ended_at = $now;
            $stream->viewer_count = 0;
            $stream->save();

            LiveViewer::query()
                ->where('live_stream_id', $stream->id)
                ->whereNull('left_at')
                ->update(['left_at' => $now, 'updated_at' => $now]);
        });

        $stream->loadMissing('owner');
        $this->notifyEnded($stream);

        return $stream;
    }

    /**
     * @return Collection<int, LiveStream>
     */
    public function listActive(User $user, int $limit, ?int $beforeId): Collection
    {
        $blockedIds = $this->blocks->relatedUserIds((int) $user->id);

        $query = LiveStream::query()
            ->with('owner')
            ->where('status', LiveStream::STATUS_LIVE)
            ->orderByDesc('id');

        if ($beforeId) {
            $query->where('id', '<', $beforeId);
        }

        if ($blockedIds !== []) {
            $query->whereNotIn('user_id', $blockedIds);
        }

        return $query->limit($limit + 1)->get();
    }

    public function findForUser(User $user, int $liveId): LiveStream
    {
        $stream = LiveStream::query()->with('owner')->find($liveId);

        if (!$stream) {
            throw new LiveNotFoundException('Live предаването не е намерено.');
        }

        if (
            !$stream->isOwnedBy((int) $user->id)
            && $this->blocks->areBlocked((int) $user->id, (int) $stream->user_id)
        ) {
            throw new LiveNotFoundException('Live предаването не е намерено.');
        }

        return $stream;
    }

    public function join(User $user, int $liveId): LiveStream
    {
        $stream = $this->findForUser($user, $liveId);

        if ($stream->isOwnedBy((int) $user->id)) {
            return $stream;
        }

        if (!$stream->isLive()) {
            throw new LiveStateException('Live предаването не е активно.');
        }

        $now = Carbon::now();

        Capsule::connection()->transaction(function () use ($stream, $user, $now): void {
            $viewer = LiveViewer::query()->firstOrNew([
                'live_stream_id' => $stream->id,
                'user_id' => (int) $user->id,
            ]);

            $wasPresent = $viewer->exists && $viewer->left_at === null;

            $viewer->joined_at = $now;
            $viewer->left_at = null;
            $viewer->save();

            if (!$wasPresent) {
                $stream->viewer_count = (int) $stream->viewer_count + 1;
                $stream->peak_viewer_count = max(
                    (int) $stream->peak_viewer_count,
                    (int) $stream->viewer_count
                );
                $stream->save();
            }
        });

        $stream->refresh();
        $stream->loadMissing('owner');

        return $stream;
    }

    public function leave(User $user, int $liveId): LiveStream
    {
        $stream = $this->findForUser($user, $liveId);

        if ($stream->isOwnedBy((int) $user->id)) {
            return $stream;
        }

        $now = Carbon::now();

        Capsule::connection()->transaction(function () use ($stream, $user, $now): void {
            $updated = LiveViewer::query()
                ->where('live_stream_id', $stream->id)
                ->where('user_id', (int) $user->id)
                ->whereNull('left_at')
                ->update(['left_at' => $now, 'updated_at' => $now]);

            if ($updated > 0 && (int) $stream->viewer_count > 0) {
                $stream->viewer_count = max(0, (int) $stream->viewer_count - 1);
                $stream->save();
            }
        });

        $stream->refresh();
        $stream->loadMissing('owner');

        return $stream;
    }

    /**
     * @return Collection<int, LiveComment>
     */
    public function listComments(User $user, int $liveId, int $limit, ?int $beforeId): Collection
    {
        $stream = $this->findForUser($user, $liveId);

        $query = LiveComment::query()
            ->with('user')
            ->where('live_stream_id', $stream->id)
            ->orderByDesc('id');

        if ($beforeId) {
            $query->where('id', '<', $beforeId);
        }

        return $query->limit($limit + 1)->get();
    }

    public function addComment(User $user, int $liveId, string $body, bool $broadcast = true): LiveComment
    {
        $stream = $this->findForUser($user, $liveId);

        if (!$stream->isLive()) {
            throw new LiveStateException('Коментари са позволени само докато предаването е на живо.');
        }

        $normalized = $this->normalizeCommentBody($body);

        $comment = LiveComment::query()->create([
            'live_stream_id' => $stream->id,
            'user_id' => (int) $user->id,
            'body' => $normalized,
        ]);

        $comment->setRelation('user', $user);
        $comment->loadMissing('user');

        if ($broadcast) {
            $this->notifyComment($comment);
        }

        return $comment;
    }

    /**
     * @return array{authorized: bool, role: ?string, status: ?string, live_id: ?int, media_room_id: ?string, media_provider: ?string}
     */
    public function authorize(int $userId, int $liveId, string $action): array
    {
        if (!in_array($action, self::ACTIONS, true)) {
            return $this->unauthorizedPayload();
        }

        $user = User::query()
            ->where('id', $userId)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->first();

        if (!$user) {
            return $this->unauthorizedPayload();
        }

        try {
            $stream = $this->findForUser($user, $liveId);
        } catch (LiveNotFoundException) {
            return $this->unauthorizedPayload();
        }

        $role = $stream->isOwnedBy($userId) ? 'streamer' : 'viewer';

        $allowed = match ($action) {
            'start', 'end' => $role === 'streamer',
            'join', 'comment', 'reaction' => $stream->isLive(),
            'leave' => true,
            default => false,
        };

        if (!$allowed) {
            return $this->unauthorizedPayload();
        }

        return [
            'authorized' => true,
            'role' => $role,
            'status' => $stream->status,
            'live_id' => (int) $stream->id,
            'media_room_id' => $stream->media_room_id,
            'media_provider' => $stream->media_provider,
        ];
    }

    public function addCommentForUserId(int $userId, int $liveId, string $body): LiveComment
    {
        $user = User::query()->find($userId);

        if (!$user) {
            throw new LivePermissionException('Потребителят не е намерен.');
        }

        return $this->addComment($user, $liveId, $body, false);
    }

    public function syncViewerCount(int $liveId, int $viewerCount): void
    {
        $stream = LiveStream::query()->find($liveId);

        if (!$stream || !$stream->isLive()) {
            return;
        }

        $count = max(0, $viewerCount);
        $stream->viewer_count = $count;
        $stream->peak_viewer_count = max((int) $stream->peak_viewer_count, $count);
        $stream->save();
    }

    public function serializeStream(LiveStream $stream, ?int $currentUserId = null): array
    {
        $owner = $stream->owner;

        return [
            'id' => (int) $stream->id,
            'title' => $stream->title,
            'status' => $stream->status,
            'media_provider' => $stream->media_provider,
            'media_room_id' => $stream->media_room_id,
            'viewer_count' => (int) $stream->viewer_count,
            'peak_viewer_count' => (int) $stream->peak_viewer_count,
            'started_at' => $stream->started_at?->toISOString(),
            'ended_at' => $stream->ended_at?->toISOString(),
            'created_at' => $stream->created_at?->toISOString(),
            'is_owner' => $currentUserId !== null && $stream->isOwnedBy($currentUserId),
            'owner' => $owner ? $owner->toChatUserArray() : null,
        ];
    }

    public function serializeComment(LiveComment $comment): array
    {
        $user = $comment->user;

        return [
            'id' => (int) $comment->id,
            'live_id' => (int) $comment->live_stream_id,
            'body' => $comment->body,
            'created_at' => $comment->created_at?->toISOString(),
            'user' => $user ? $user->toChatUserArray() : null,
        ];
    }

    public static function isValidReaction(string $type): bool
    {
        return in_array($type, self::REACTION_TYPES, true);
    }

    private function findOwnedStream(int $liveId, int $userId): LiveStream
    {
        $stream = LiveStream::query()->find($liveId);

        if (!$stream) {
            throw new LiveNotFoundException('Live предаването не е намерено.');
        }

        if (!$stream->isOwnedBy($userId)) {
            throw new LivePermissionException('Само собственикът може да управлява това live предаване.');
        }

        return $stream;
    }

    private function findOpenStreamForUser(int $userId): ?LiveStream
    {
        return LiveStream::query()
            ->where('user_id', $userId)
            ->whereIn('status', [LiveStream::STATUS_IDLE, LiveStream::STATUS_LIVE])
            ->orderByDesc('id')
            ->first();
    }

    private function normalizeTitle(?string $title): ?string
    {
        if ($title === null) {
            return null;
        }

        $trimmed = trim($title);

        return $trimmed === '' ? null : mb_substr($trimmed, 0, 120);
    }

    private function normalizeCommentBody(string $body): string
    {
        $trimmed = trim($body);

        if ($trimmed === '') {
            throw new RuntimeException('Коментарът не може да бъде празен.');
        }

        if (mb_strlen($trimmed) > LiveComment::MAX_BODY_LENGTH) {
            throw new RuntimeException('Коментарът е твърде дълъг.');
        }

        return $trimmed;
    }

    /**
     * @return array{authorized: bool, role: null, status: null, live_id: null, media_room_id: null, media_provider: null}
     */
    private function unauthorizedPayload(): array
    {
        return [
            'authorized' => false,
            'role' => null,
            'status' => null,
            'live_id' => null,
            'media_room_id' => null,
            'media_provider' => null,
        ];
    }

    private function notifyEnded(LiveStream $stream): void
    {
        try {
            $this->realtime()->notifyLiveEnded((int) $stream->id);
        } catch (Throwable $exception) {
            error_log('[LiveStreamService] realtime end notify failed: ' . $exception->getMessage());
        }
    }

    private function notifyComment(LiveComment $comment): void
    {
        try {
            $this->realtime()->notifyLiveComment($this->serializeComment($comment));
        } catch (Throwable $exception) {
            error_log('[LiveStreamService] realtime comment notify failed: ' . $exception->getMessage());
        }
    }

    private function realtime(): RealtimeNotifier
    {
        return $this->realtimeNotifier ??= new RealtimeNotifier();
    }
}
