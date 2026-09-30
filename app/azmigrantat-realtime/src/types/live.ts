export type LiveRole = 'streamer' | 'viewer';
export type LiveTalkRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'expired';

export type LiveReactionType =
    | 'like'
    | 'heart'
    | 'fire'
    | 'clap'
    | 'wow'
    | 'laugh'
    | 'sad'
    | 'angry'
    | 'party'
    | 'rocket'
    | 'cool'
    | 'kiss'
    | 'wink'
    | 'surprised'
    | 'cry'
    | 'scream'
    | 'poop'
    | 'sparkles'
    | 'star'
    | 'pray';

export interface LiveClientPayload {
    live_id: number;
}

export interface LiveJoinClientPayload extends LiveClientPayload {}

export interface LiveLeaveClientPayload extends LiveClientPayload {}

export interface LiveCommentClientPayload extends LiveClientPayload {
    body: string;
}

export interface LiveReactionClientPayload extends LiveClientPayload {
    type: string;
}

export interface LiveTalkRequestClientPayload extends LiveClientPayload {
    request_id?: string;
}

export interface LiveTalkRequestPayload {
    request_id: string;
    live_id: number;
    status: LiveTalkRequestStatus;
    viewer: LiveUserPreview;
}

export interface LiveTalkRequestAcceptedPayload extends LiveTalkRequestPayload {
    status: 'accepted';
    media_session: Record<string, unknown>;
}

export interface LiveUserPreview {
    id: number;
    name: string;
    username?: string | null;
    public_code?: string | null;
    profile_image?: string | null;
    cover_image?: string | null;
    is_active?: boolean;
}

export interface LiveCommentPayload {
    id: number;
    live_id: number;
    body: string;
    created_at: string | null;
    user: LiveUserPreview | null;
}

export interface LiveViewerCountPayload {
    live_id: number;
    viewer_count: number;
}

export interface LiveCameraStatePayload {
    live_id: number;
    user_id: number;
    camera_enabled: boolean;
}

export interface LiveEndedPayload {
    live_id: number;
}

export interface LiveStreamBroadcastPayload {
    id: number;
    title: string | null;
    status: string;
    media_provider: string;
    media_room_id: string | null;
    viewer_count: number;
    peak_viewer_count?: number;
    started_at: string | null;
    ended_at: string | null;
    created_at: string | null;
    is_owner?: boolean;
    cover_image?: string | null;
    owner: LiveUserPreview | null;
}

export interface LiveStartedPayload {
    stream: LiveStreamBroadcastPayload;
}

export interface LiveReactionPayload {
    live_id: number;
    type: LiveReactionType;
    user: {
        id: number;
        name: string;
    };
}

export interface LiveErrorPayload {
    live_id: number | null;
    code: string;
    message: string;
}
