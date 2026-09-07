import { createAudioPlayer } from "expo-audio";
import { AppState } from "react-native";

const SOUND_SOURCES = {
  sendMessage: require("../../assets/sounds/send_message.wav"),
  receiveMessage: require("../../assets/sounds/receive_message.wav"),
  receiveMessageInChatRoom: require("../../assets/sounds/receive_message_in_chat_room.wav"),
  blockUser: require("../../assets/sounds/block_user.wav"),
} as const;

export type AppSound = keyof typeof SOUND_SOURCES;

const players = new Map<AppSound, ReturnType<typeof createAudioPlayer>>();

function getPlayer(sound: AppSound) {
  let player = players.get(sound);

  if (!player) {
    player = createAudioPlayer(SOUND_SOURCES[sound], {
      keepAudioSessionActive: false,
    });
    player.loop = false;
    players.set(sound, player);
  }

  return player;
}

export function playAppSound(
  sound: AppSound,
  options?: { requireActiveApp?: boolean },
): void {
  if (
    options?.requireActiveApp !== false &&
    AppState.currentState !== "active"
  ) {
    return;
  }

  try {
    const player = getPlayer(sound);
    void player.seekTo(0).then(() => {
      player.play();
    });
  } catch (error) {
    console.error("Звукът не можа да се пусне:", error);
  }
}
