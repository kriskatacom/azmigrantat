export type BunnyUploadProgressEvent = {
  uploadId: string;
  percentage: number;
  status: "uploading" | "success" | "error";
  message?: string;
  code?: "token_expired";
};
