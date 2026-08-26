export type LiveRole = 'streamer' | 'viewer';

export type LiveReactionType = 'like' | 'heart' | 'fire' | 'clap' | 'wow';

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

export interface LiveUserPreview {
    id: number;
    name: string;
    username?: string | null;
    public_code?: string | null;
    profile_image?: string | null;
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

export interface LiveEndedPayload {
    live_id: number;
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
