import { authorizedJson } from "@/services/session-http";

const API_URL = process.env.EXPO_PUBLIC_API_URL!;
const FORCE_TURN = process.env.EXPO_PUBLIC_FORCE_TURN === "true";
const REFRESH_SKEW_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4_000;
const FAILURE_RETRY_MS = 30_000;

export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type RtcPeerConfig = {
  iceServers: IceServerConfig[];
  iceTransportPolicy: "all" | "relay";
};

const STUN_ONLY: RtcPeerConfig = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
  iceTransportPolicy: FORCE_TURN ? "relay" : "all",
};

type CachedCredentials = {
  config: RtcPeerConfig;
  expiresAtMs: number;
};

let cache: CachedCredentials | null = null;
let inFlight: Promise<RtcPeerConfig> | null = null;

type TurnCredentialsResponse = {
  success: true;
  iceServers: IceServerConfig[];
  expires_at: number;
  ttl?: number;
};

function isUsableCache(now: number): boolean {
  return cache !== null && cache.expiresAtMs - REFRESH_SKEW_MS > now;
}

function hasTurnServer(config: RtcPeerConfig): boolean {
  return config.iceServers.some((server) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    return urls.some((url) => url.startsWith("turn:") || url.startsWith("turns:"));
  });
}

async function requestTurnCredentials(token: string): Promise<RtcPeerConfig> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await authorizedJson<TurnCredentialsResponse>(
      `${API_URL}/api/mobile/turn-credentials`,
      token,
      { method: "GET", signal: controller.signal },
    );

    if (!Array.isArray(response.iceServers) || response.iceServers.length === 0) {
      throw new Error("Празен iceServers отговор.");
    }

    const expiresAtMs =
      Number.isFinite(response.expires_at) && response.expires_at > 0
        ? response.expires_at * 1000
        : Date.now() + 60 * 60 * 1000;

    cache = {
      config: {
        iceServers: response.iceServers,
        iceTransportPolicy: FORCE_TURN ? "relay" : "all",
      },
      expiresAtMs,
    };

    return cache.config;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRtcPeerConfig(token?: string | null): Promise<RtcPeerConfig> {
  const now = Date.now();
  if (cache && isUsableCache(now)) {
    return cache.config;
  }

  if (!token) {
    console.warn("[CALL] TURN credentials skipped: missing access token, using STUN-only");
    return STUN_ONLY;
  }

  if (!inFlight) {
    inFlight = requestTurnCredentials(token)
      .catch((error: unknown) => {
        console.warn("[CALL] TURN credentials unavailable, using STUN-only", error);
        cache = {
          config: STUN_ONLY,
          expiresAtMs: Date.now() + FAILURE_RETRY_MS + REFRESH_SKEW_MS,
        };
        return STUN_ONLY;
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}

export function hasCachedTurnCredentials(): boolean {
  return cache !== null && hasTurnServer(cache.config) && isUsableCache(Date.now());
}
