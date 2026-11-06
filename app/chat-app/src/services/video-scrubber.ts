export function videoTimeForScrubPosition(
  locationX: number,
  trackWidth: number,
  duration: number,
): number | null {
  if (
    !Number.isFinite(locationX)
    || !Number.isFinite(trackWidth)
    || !Number.isFinite(duration)
    || trackWidth <= 0
    || duration <= 0
  ) {
    return null;
  }

  const progress = Math.min(1, Math.max(0, locationX / trackWidth));
  return progress * duration;
}
