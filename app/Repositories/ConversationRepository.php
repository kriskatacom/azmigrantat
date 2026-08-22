<?php

namespace App\Repositories;

use App\Models\Conversation;
use App\Models\Participant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;

final class ConversationRepository
{
    public function getForUser(User $user): Collection
    {
        return Conversation::query()
            ->where('type', 'direct')
            ->where('is_active', true)
            ->whereNotNull('last_message_id')
            ->whereHas('participants', function ($query) use ($user) {
                $query
                    ->where('user_id', $user->id)
                    ->whereNull('left_at');
            })
            ->whereExists(function ($query) use ($user) {
                $query->from('messages')
                    ->join('participants as visibility_participants', function ($join) use ($user) {
                        $join
                            ->on(
                                'visibility_participants.conversation_id',
                                '=',
                                'messages.conversation_id'
                            )
                            ->where('visibility_participants.user_id', $user->id);
                    })
                    ->whereColumn('messages.conversation_id', 'conversations.id')
                    ->whereNull('messages.deleted_at')
                    ->where(function ($visible) {
                        $visible
                            ->whereNull('visibility_participants.cleared_before_id')
                            ->orWhereColumn(
                                'messages.id',
                                '>',
                                'visibility_participants.cleared_before_id'
                            );
                    })
                    ->where(function ($visible) use ($user) {
                        $visible
                            ->whereNull('visibility_participants.cleared_own_before_id')
                            ->orWhere('messages.sender_id', '!=', $user->id)
                            ->orWhereColumn(
                                'messages.id',
                                '>',
                                'visibility_participants.cleared_own_before_id'
                            );
                    });
            })
            ->with([
                'lastMessage.sender',
                'lastMessage.reactions',
                'participants' => function ($query) {
                    $query->whereNull('left_at');
                },
                'participants.user',
            ])
            ->orderByDesc('last_message_id')
            ->orderByDesc('updated_at')
            ->get();
    }

    public function findForUser(
        int $conversationId,
        int $userId
    ): ?Conversation {
        return Conversation::query()
            ->where('id', $conversationId)
            ->where('is_active', true)
            ->whereHas('participants', function ($query) use ($userId) {
                $query
                    ->where('user_id', $userId)
                    ->whereNull('left_at');
            })
            ->first();
    }

    public function findDirectByKey(string $directKey): ?Conversation
    {
        return Conversation::query()
            ->where('type', 'direct')
            ->where('direct_key', $directKey)
            ->first();
    }

    public function createDirect(
        User $creator,
        string $directKey
    ): Conversation {
        return Conversation::create([
            'type' => 'direct',
            'direct_key' => $directKey,
            'created_by' => $creator->id,
            'is_active' => true,
        ]);
    }

    public function addParticipant(
        Conversation $conversation,
        User $user,
        string $role = Participant::ROLE_MEMBER
    ): Participant {
        return Participant::firstOrCreate(
            [
                'conversation_id' => $conversation->id,
                'user_id' => $user->id,
            ],
            [
                'role' => $role,
                'joined_at' => Carbon::now(),
            ]
        );
    }

    public function findParticipant(
        int $conversationId,
        int $userId
    ): ?Participant {
        return Participant::query()
            ->where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->first();
    }

    public function updateLastMessage(
        Conversation $conversation,
        ?int $messageId
    ): bool {
        return $conversation->update([
            'last_message_id' => $messageId,
            'updated_at' => Carbon::now(),
        ]);
    }

    public function loadDetails(
        Conversation $conversation
    ): Conversation {
        return $conversation->load([
            'lastMessage.sender',
            'lastMessage.reactions',
            'participants' => function ($query) {
                $query->whereNull('left_at');
            },
            'participants.user',
        ]);
    }
}
