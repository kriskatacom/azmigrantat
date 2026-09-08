import * as Battery from "expo-battery";

import type { AppSocket } from "@/services/socket";
import type { DeviceBatteryPayload } from "@/services/video-call";

export async function readDeviceBattery(): Promise<DeviceBatteryPayload | null> {
  if (!(await Battery.isAvailableAsync())) {
    return null;
  }

  const power = await Battery.getPowerStateAsync();
  if (!Number.isFinite(power.batteryLevel) || power.batteryLevel < 0) {
    return null;
  }

  return {
    batteryLevel: Math.min(1, Math.max(0, power.batteryLevel)),
    isCharging:
      power.batteryState === Battery.BatteryState.CHARGING ||
      power.batteryState === Battery.BatteryState.FULL,
    updatedAt: Date.now(),
  };
}

export async function emitDeviceBattery(
  socket: AppSocket | null,
): Promise<DeviceBatteryPayload | null> {
  const battery = await readDeviceBattery();
  if (socket?.connected && battery) {
    socket.emit("device:battery", battery);
  }
  return battery;
}
