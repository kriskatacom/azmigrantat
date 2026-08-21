<?php

namespace App\Controllers\Api;

use App\Controllers\BaseController;
use App\Models\OauthAccessToken;
use App\Models\User;
use App\Models\UserBlock;
use App\Services\BlockService;
use Illuminate\Support\Facades\Validator;
use RuntimeException;

final class BlockController extends BaseController
{
    private BlockService $blockService;

    public function __construct()
    {
        $this->blockService = new BlockService();
    }

    public function index()
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $limit = min(50, max(1, (int) ($_GET['limit'] ?? 30)));
        $beforeId = isset($_GET['before_id']) ? (int) $_GET['before_id'] : null;

        $query = UserBlock::query()
            ->where('blocker_id', $user->id)
            ->with('blocked')
            ->orderByDesc('id');

        if ($beforeId) {
            $query->where('id', '<', $beforeId);
        }

        $blocks = $query->limit($limit + 1)->get();
        $hasMore = $blocks->count() > $limit;
        $blocks = $blocks->take($limit);

        return $this->json([
            'success' => true,
            'data' => $blocks
                ->map(fn (UserBlock $block) => $this->serializeBlock($block))
                ->values(),
            'meta' => [
                'has_more' => $hasMore,
                'next_before_id' => $hasMore
                    ? (int) $blocks->last()?->id
                    : null,
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
            ['code' => 'required|string|max:20'],
            [
                'required' => 'Полето :attribute е задължително.',
                'string' => 'Полето :attribute трябва да бъде текст.',
            ],
            ['code' => 'код']
        );

        if ($validator->fails()) {
            return $this->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        try {
            $block = $this->blockService->blockByCode($user, (string) $input['code']);
            $block->load('blocked');

            return $this->json([
                'success' => true,
                'message' => 'Потребителят беше блокиран.',
                'data' => $this->serializeBlock($block),
            ], 201);
        } catch (RuntimeException $exception) {
            return $this->json([
                'success' => false,
                'message' => $exception->getMessage(),
            ], 422);
        }
    }

    public function destroy($id)
    {
        $user = $this->authenticatedUser();

        if (!$user) {
            return $this->unauthorized();
        }

        $unblocked = $this->blockService->unblock($user, (int) $id);

        if (!$unblocked) {
            return $this->json([
                'success' => false,
                'message' => 'Блокирането не е намерено.',
            ], 404);
        }

        return $this->json([
            'success' => true,
            'message' => 'Потребителят беше отблокиран.',
        ]);
    }

    private function serializeBlock(UserBlock $block): array
    {
        $blocked = $block->blocked;

        return [
            'id' => (int) $block->id,
            'blocked_user_id' => (int) $block->blocked_id,
            'name' => $blocked?->name,
            'public_code' => $blocked?->formattedPublicCode(),
            'profile_image' => $blocked?->profile_image_url,
            'created_at' => $block->created_at?->toISOString(),
        ];
    }

    private function authenticatedUser(): ?User
    {
        return OauthAccessToken::userFromRequest();
    }

    private function jsonInput(): array
    {
        $input = json_decode(file_get_contents('php://input'), true);

        return is_array($input) ? $input : [];
    }

    private function unauthorized()
    {
        return $this->json([
            'success' => false,
            'message' => 'Необходима е автентикация.',
        ], 401);
    }
}
