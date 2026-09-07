import type { LiveStream } from "@/types/live";
import { toPublicFileUrl } from "@/utils/public-file-url";

export function normalizeLiveStream(
  stream: LiveStream,
  selfCover?: string | null,
): LiveStream {
  const ownerCover =
    toPublicFileUrl(stream.owner?.cover_image) ?? stream.owner?.cover_image ?? null;
  const listedCover = toPublicFileUrl(stream.cover_image) ?? stream.cover_image ?? null;
  const ownCover = stream.is_owner
    ? (toPublicFileUrl(selfCover) ?? selfCover ?? null)
    : null;
  const profileImage =
    toPublicFileUrl(stream.owner?.profile_image) ?? stream.owner?.profile_image ?? null;
  const cover = listedCover ?? ownerCover ?? ownCover ?? null;

  return {
    ...stream,
    cover_image: cover,
    owner: stream.owner
      ? {
          ...stream.owner,
          profile_image: profileImage,
          cover_image: ownerCover ?? ownCover ?? null,
        }
      : null,
  };
}
