import type {
  LiveMediaProvider,
  LiveMediaSession,
  LiveMediaState,
} from "@/services/live-media/types";

export class MockLiveMediaProvider implements LiveMediaProvider {
  readonly name = "mock";

  private state: LiveMediaState = {
    connected: false,
    muted: false,
    cameraEnabled: true,
    session: null,
  };

  getState(): LiveMediaState {
    return { ...this.state };
  }

  async startStream(session: LiveMediaSession): Promise<void> {
    this.state = {
      connected: true,
      muted: false,
      cameraEnabled: true,
      session,
    };
    console.log("[LiveMedia:mock] startStream", session);
  }

  async joinStream(session: LiveMediaSession): Promise<void> {
    this.state = {
      connected: true,
      muted: false,
      cameraEnabled: true,
      session,
    };
    console.log("[LiveMedia:mock] joinStream", session);
  }

  async leaveStream(session: LiveMediaSession): Promise<void> {
    console.log("[LiveMedia:mock] leaveStream", session);
    this.reset();
  }

  async stopStream(session: LiveMediaSession): Promise<void> {
    console.log("[LiveMedia:mock] stopStream", session);
    this.reset();
  }

  async muteAudio(muted: boolean): Promise<void> {
    this.state = { ...this.state, muted };
    console.log("[LiveMedia:mock] muteAudio", muted);
  }

  async toggleCamera(): Promise<boolean> {
    const cameraEnabled = !this.state.cameraEnabled;
    this.state = { ...this.state, cameraEnabled };
    console.log("[LiveMedia:mock] toggleCamera", cameraEnabled);
    return cameraEnabled;
  }

  private reset(): void {
    this.state = {
      connected: false,
      muted: false,
      cameraEnabled: true,
      session: null,
    };
  }
}

let sharedMock: MockLiveMediaProvider | null = null;

export function getMockLiveMediaProvider(): MockLiveMediaProvider {
  sharedMock ??= new MockLiveMediaProvider();
  return sharedMock;
}
