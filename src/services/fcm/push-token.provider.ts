export interface FcmToken {
    token: string;
    platform: 'android';
    provider: 'fcm';
}

export interface PushTokenProvider {
    getActiveFcmTokensForUser(userId: number): Promise<FcmToken[]>;
    deactivateToken(token: string, reason: string): Promise<void>;
}
