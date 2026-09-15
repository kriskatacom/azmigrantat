import { NativeModule, requireNativeModule } from "expo";
import type { BunnyUploadProgressEvent } from "./BunnyNativeUpload.types";

type NativeUploadModule = NativeModule<{
  onProgress: (event: BunnyUploadProgressEvent) => void;
}> & {
  addListener: (
    eventName: "onProgress",
    listener: (event: BunnyUploadProgressEvent) => void,
  ) => { remove: () => void };
  startUpload: (
    sourceUri: string,
    endpoint: string,
    libraryId: number,
    videoId: string,
    signature: string,
    expires: number,
    contentType: string,
    backgroundConfig: string,
  ) => string;
  cancelUpload: (uploadId: string) => void;
};

const BunnyNativeUpload = requireNativeModule<NativeUploadModule>("BunnyNativeUpload");

export default BunnyNativeUpload;

export function cancelNativeUpload(uploadId: string): void {
  BunnyNativeUpload.cancelUpload(uploadId);
}
