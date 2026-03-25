export type CloudinaryUploadKind = "image" | "svg" | "video" | "music";

export type CloudinaryUploadResponse = {
  secureUrl?: string;
  originalFilename?: string;
  error?: string;
};

type UploadOptions = {
  file: File;
  kind: CloudinaryUploadKind;
  onProgress?: (progress: number) => void;
};

export function uploadFileToCloudinary({ file, kind, onProgress }: UploadOptions) {
  return new Promise<CloudinaryUploadResponse>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    const request = new XMLHttpRequest();
    request.open("POST", "/api/cloudinary/upload");
    request.responseType = "json";

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
    };

    request.onerror = () => {
      reject(new Error("Network error while uploading media."));
    };

    request.onload = () => {
      const response = (request.response ?? null) as CloudinaryUploadResponse | null;
      if (request.status >= 200 && request.status < 300 && response?.secureUrl) {
        onProgress?.(100);
        resolve(response);
        return;
      }

      const message =
        response?.error ||
        (request.status === 401
          ? "You need to sign in again before uploading media."
          : "Failed to upload media.");
      reject(new Error(message));
    };

    request.send(formData);
  });
}
