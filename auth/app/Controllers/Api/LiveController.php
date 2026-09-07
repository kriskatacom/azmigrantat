<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Exceptions\LiveNotFoundException;
use App\Exceptions\LivePermissionException;
use App\Exceptions\LiveStateException;
use App\Models\LiveComment;
use App\Models\LiveStream;
use App\Services\LiveStreamService;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

final class LiveController extends BaseController
{
    private LiveStreamService $lives;

    public function __construct()
    {
        $this->lives = new LiveStreamService();
    }

    public function index()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $limit = min(50, max(1, (int) ($_GET['limit'] ?? 30)));
        $beforeId = isset($_GET['before_id']) ? (int) $_GET['before_id'] : null;

        $streams = $this->lives->listActive($user, $limit, $beforeId);
        $hasMore = $streams->count() > $limit;
        $streams = $streams->take($limit);

        return $this->json([
            'success' => true,
            'data' => $streams
                ->map(fn (LiveStream $stream) => $this->lives->serializeStream($stream, (int) $user->id))
                ->values(),
            'meta' => [
                'has_more' => $hasMore,
                'next_before_id' => $hasMore ? (int) $streams->last()?->id : null,
            ],
        ]);
    }

    public function store()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();
        $validator = Validator::make(
            $input,
            ['title' => 'nullable|string|max:120'],
            [
                'string' => 'Полето :attribute трябва да бъде текст.',
                'max' => 'Полето :attribute не може да е по-дълго от :max символа.',
            ],
            ['title' => 'заглавие']
        );

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        try {
            $stream = $this->lives->create($user, isset($input['title']) ? (string) $input['title'] : null);
        } catch (LiveStateException $exception) {
            return $this->json(['success' => false, 'message' => $exception->getMessage()], 409);
        }

        return $this->json([
            'success' => true,
            'data' => $this->lives->serializeStream($stream, (int) $user->id),
        ], 201);
    }

    public function show($id)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        try {
            $stream = $this->lives->findForUser($user, (int) $id);
        } catch (LiveNotFoundException $exception) {
            return $this->json(['success' => false, 'message' => $exception->getMessage()], 404);
        }

        return $this->json([
            'success' => true,
            'data' => $this->lives->serializeStream($stream, (int) $user->id),
        ]);
    }

    public function start($id)
    {
        return $this->mutateOwned($id, fn ($user, $liveId) => $this->lives->start($user, $liveId));
    }

    public function end($id)
    {
        return $this->mutateOwned($id, fn ($user, $liveId) => $this->lives->end($user, $liveId));
    }

    public function join($id)
    {
        return $this->mutatePresence($id, fn ($user, $liveId) => $this->lives->join($user, $liveId));
    }

    public function leave($id)
    {
        return $this->mutatePresence($id, fn ($user, $liveId) => $this->lives->leave($user, $liveId));
    }

    public function comments($id)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $limit = min(50, max(1, (int) ($_GET['limit'] ?? 30)));
        $beforeId = isset($_GET['before_id']) ? (int) $_GET['before_id'] : null;

        try {
            $comments = $this->lives->listComments($user, (int) $id, $limit, $beforeId);
        } catch (LiveNotFoundException $exception) {
            return $this->json(['success' => false, 'message' => $exception->getMessage()], 404);
        }

        $hasMore = $comments->count() > $limit;
        $comments = $comments->take($limit);

        return $this->json([
            'success' => true,
            'data' => $comments
                ->map(fn (LiveComment $comment) => $this->lives->serializeComment($comment))
                ->values(),
            'meta' => [
                'has_more' => $hasMore,
                'next_before_id' => $hasMore ? (int) $comments->last()?->id : null,
            ],
        ]);
    }

    public function storeComment($id)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $input = $this->jsonInput();
        $validator = Validator::make(
            $input,
            ['body' => 'required|string|max:' . LiveComment::MAX_BODY_LENGTH],
            [
                'required' => 'Полето :attribute е задължително.',
                'string' => 'Полето :attribute трябва да бъде текст.',
                'max' => 'Полето :attribute не може да е по-дълго от :max символа.',
            ],
            ['body' => 'коментар']
        );

        if ($validator->fails()) {
            return $this->validationError($validator);
        }

        try {
            $comment = $this->lives->addComment($user, (int) $id, (string) $input['body']);
        } catch (LiveNotFoundException $exception) {
            return $this->json(['success' => false, 'message' => $exception->getMessage()], 404);
        } catch (LiveStateException $exception) {
            return $this->json(['success' => false, 'message' => $exception->getMessage()], 409);
        } catch (RuntimeException $exception) {
            return $this->json(['success' => false, 'message' => $exception->getMessage()], 422);
        }

        return $this->json([
            'success' => true,
            'data' => $this->lives->serializeComment($comment),
        ], 201);
    }

    private function mutateOwned($id, callable $action)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        try {
            $stream = $action($user, (int) $id);
        } catch (LiveNotFoundException $exception) {
            return $this->json(['success' => false, 'message' => $exception->getMessage()], 404);
        } catch (LivePermissionException $exception) {
            return $this->json(['success' => false, 'message' => $exception->getMessage()], 403);
        } catch (LiveStateException $exception) {
            return $this->json(['success' => false, 'message' => $exception->getMessage()], 409);
        }

        return $this->json([
            'success' => true,
            'data' => $this->lives->serializeStream($stream, (int) $user->id),
        ]);
    }

    private function mutatePresence($id, callable $action)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        try {
            $stream = $action($user, (int) $id);
        } catch (LiveNotFoundException $exception) {
            return $this->json(['success' => false, 'message' => $exception->getMessage()], 404);
        } catch (LiveStateException $exception) {
            return $this->json(['success' => false, 'message' => $exception->getMessage()], 409);
        }

        return $this->json([
            'success' => true,
            'data' => $this->lives->serializeStream($stream, (int) $user->id),
        ]);
    }

    private function jsonInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);

        return is_array($input) ? $input : [];
    }

    private function validationError($validator)
    {
        return $this->json([
            'success' => false,
            'message' => $validator->errors()->first(),
            'errors' => $validator->errors()->toArray(),
        ], 422);
    }

    private function unauthorized()
    {
        return $this->json([
            'success' => false,
            'message' => 'Необходима е автентикация.',
        ], 401);
    }
}
