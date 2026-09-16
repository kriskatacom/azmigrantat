import { Device } from "mediasoup-client";
import { io, type Socket } from "socket.io-client";
import { mediaDevices, MediaStream, registerGlobals } from "react-native-webrtc";

import type {
  LiveMediaProvider,
  LiveMediaSession,
  LiveMediaState,
} from "@/services/live-media/types";

type AckResponse = { ok: boolean; [key: string]: unknown };
type TransportInfo = {
  id: string;
  ice_parameters: unknown;
  ice_candidates: unknown[];
  dtls_parameters: unknown;
  sctp_parameters?: unknown;
};

export class MediasoupLiveMediaProvider implements LiveMediaProvider {
  readonly name = "mediasoup";

  private state: LiveMediaState = {
    connected: false,
    error: null,
    muted: false,
    cameraEnabled: true,
    session: null,
    localStream: null,
    remoteStream: null,
  };

  private socket: Socket | null = null;
  private device: Device | null = null;
  private sendTransport: ReturnType<Device["createSendTransport"]> | null = null;
  private recvTransport: ReturnType<Device["createRecvTransport"]> | null = null;
  private readonly producers = new Map<string, { close: () => void }>();
  private readonly consumers = new Map<string, { close: () => void }>();
  private readonly consumedProducerIds = new Set<string>();

  getState(): LiveMediaState {
    return { ...this.state };
  }

  async startStream(session: LiveMediaSession): Promise<void> {
    await this.connect(session);
    const localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: "user" },
    });

    this.state = { ...this.state, localStream };
    for (const track of localStream.getTracks()) {
      const producer = await this.sendTransport?.produce({
        track: track as unknown as globalThis.MediaStreamTrack,
      });
      if (producer) this.producers.set(producer.id, producer);
    }
  }

  async joinStream(session: LiveMediaSession): Promise<void> {
    await this.connect(session);
  }

  async leaveStream(_session: LiveMediaSession): Promise<void> {
    this.closeResources();
  }

  async stopStream(_session: LiveMediaSession): Promise<void> {
    this.closeResources();
  }

  async muteAudio(muted: boolean): Promise<void> {
    for (const track of this.state.localStream?.getAudioTracks() ?? []) {
      track.enabled = !muted;
    }
    this.state = { ...this.state, muted };
  }

  async toggleCamera(): Promise<boolean> {
    const cameraEnabled = !this.state.cameraEnabled;
    for (const track of this.state.localStream?.getVideoTracks() ?? []) {
      track.enabled = cameraEnabled;
    }
    this.state = { ...this.state, cameraEnabled };
    return cameraEnabled;
  }

  private async connect(session: LiveMediaSession): Promise<void> {
    if (session.provider !== "mediasoup") {
      throw new Error(`Неподдържан live media provider: ${session.provider}`);
    }
    if (!session.sessionId || !session.signalingUrl || !session.routerRtpCapabilities) {
      throw new Error("Липсва mediasoup session или signaling configuration.");
    }

    registerGlobals();
    this.closeResources();
    const socket = io(session.signalingUrl, {
      auth: { session_id: session.sessionId },
      transports: ["websocket"],
      autoConnect: true,
    });
    this.socket = socket;
    socket.on("sfu:producer-available", (payload: { producer_id?: string }) => {
      if (session.role === "viewer" && payload?.producer_id) {
        void this.consumeProducer(payload.producer_id);
      }
    });

    const ready = await new Promise<{ producer_ids?: string[] }>((resolve, reject) => {
      const onReady = (payload: { producer_ids?: string[] }) => resolve(payload ?? {});
      const onError = (error: Error) => reject(error);
      socket.once("sfu:ready", onReady);
      socket.once("sfu:error", onError);
      socket.once("connect_error", onError);
    });

    this.device = await Device.factory();
    await this.device.load({ routerRtpCapabilities: session.routerRtpCapabilities as never });
    const transport = await this.createTransport(session.role === "streamer" ? "send" : "recv");

    if (session.role === "streamer") {
      this.sendTransport = transport;
    } else {
      this.recvTransport = transport;
      for (const producerId of ready.producer_ids ?? []) {
        await this.consumeProducer(producerId);
      }
    }

    this.state = {
      ...this.state,
      connected: true,
      error: null,
      session,
      localStream: this.state.localStream,
      remoteStream: this.state.remoteStream,
    };
  }

  private async createTransport(direction: "send" | "recv") {
    if (!this.device) throw new Error("Mediasoup device is not initialized.");
    const payload = await this.emitAck<{ transport: TransportInfo }>("transport:create", { direction });
    const info = payload.transport;
    const options = {
      id: info.id,
      iceParameters: info.ice_parameters,
      iceCandidates: info.ice_candidates,
      dtlsParameters: info.dtls_parameters,
      sctpParameters: info.sctp_parameters,
    } as never;
    const transport = direction === "send"
      ? this.device.createSendTransport(options)
      : this.device.createRecvTransport(options);

    transport.on("connect", ({ dtlsParameters }, callback, errback) => {
      void this.emitAck("transport:connect", {
        transport_id: transport.id,
        dtls_parameters: dtlsParameters,
      }).then(() => callback()).catch(errback);
    });

    if (direction === "send") {
      transport.on("produce", ({ kind, rtpParameters }, callback, errback) => {
        void this.emitAck<{ producer_id: string }>("producer:create", {
          transport_id: transport.id,
          kind,
          rtp_parameters: rtpParameters,
        }).then(({ producer_id }) => callback({ id: producer_id })).catch(errback);
      });
    }

    return transport;
  }

  private async consumeProducer(producerId: string): Promise<void> {
    if (!this.recvTransport || !this.device || this.consumedProducerIds.has(producerId)) return;
    this.consumedProducerIds.add(producerId);
    try {
      const payload = await this.emitAck<{ consumer: {
        id: string;
        producer_id: string;
        kind: "audio" | "video";
        rtp_parameters: unknown;
      } }>("consumer:create", {
        transport_id: this.recvTransport.id,
        producer_id: producerId,
        rtp_capabilities: this.device.recvRtpCapabilities,
      });
      const info = payload.consumer;
      const consumer = await this.recvTransport.consume({
        id: info.id,
        producerId: info.producer_id,
        kind: info.kind,
        rtpParameters: info.rtp_parameters as never,
      });
      const remoteStream = this.state.remoteStream ?? new MediaStream();
      remoteStream.addTrack(consumer.track as unknown as Parameters<MediaStream["addTrack"]>[0]);
      this.state = { ...this.state, remoteStream };
      this.consumers.set(info.id, consumer);
      await this.emitAck("consumer:resume", { consumer_id: info.id });
    } catch (error) {
      this.consumedProducerIds.delete(producerId);
      throw error;
    }
  }

  private emitAck<T extends { [key: string]: unknown } = { [key: string]: unknown }>(event: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error("Mediasoup signaling socket is not connected."));
        return;
      }
      this.socket.emit(event, payload, (response: AckResponse) => {
        if (!response?.ok) {
          reject(new Error(String(response?.message ?? `SFU event failed: ${event}`)));
          return;
        }
        resolve(response as unknown as T);
      });
    });
  }

  private closeResources(): void {
    for (const producer of this.producers.values()) producer.close();
    for (const consumer of this.consumers.values()) consumer.close();
    this.producers.clear();
    this.consumers.clear();
    this.consumedProducerIds.clear();
    this.sendTransport?.close();
    this.recvTransport?.close();
    this.socket?.disconnect();
    for (const track of this.state.localStream?.getTracks() ?? []) track.stop();
    this.sendTransport = null;
    this.recvTransport = null;
    this.device = null;
    this.socket = null;
    this.state = {
      connected: false,
      error: null,
      muted: false,
      cameraEnabled: true,
      session: null,
      localStream: null,
      remoteStream: null,
    };
  }
}

let sharedMediasoup: MediasoupLiveMediaProvider | null = null;

export function getMediasoupLiveMediaProvider(): MediasoupLiveMediaProvider {
  sharedMediasoup ??= new MediasoupLiveMediaProvider();
  return sharedMediasoup;
}
