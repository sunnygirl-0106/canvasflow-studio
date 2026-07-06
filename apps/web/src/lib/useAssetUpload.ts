import { useState, useCallback } from "react";
import { useCanvas } from "@/store/canvasStore";
import { fileToDataUrl } from "@/lib/fileToDataUrl";

const BASE = "/api";

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
}

interface UploadResult {
  /** The URL to store in state (object storage URL or local blob fallback) */
  url: string;
}

/**
 * Hook that encapsulates:
 * 1. Request presigned URL from backend
 * 2. PUT file directly to object storage
 * 3. Return the public URL to write into state
 *
 * In dev mode (no S3 configured), falls back to a local blob URL.
 */
export function useAssetUpload() {
  const projectId = useCanvas((s) => s.projectId);
  const [state, setState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
  });

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setState({ uploading: true, progress: 0, error: null });

      try {
        // 1. Get presigned URL from backend
        const res = await fetch(`${BASE}/assets/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            size: file.size,
            projectId,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error ?? `Upload failed: ${res.status}`);
        }

        const data = await res.json();

        // Dev fallback: S3 not configured. Inline as a base64 data URL so the
        // image persists with the canvas across refresh (a `blob:` URL would be
        // dead on reload). Size-capped by fileToDataUrl.
        if (data.mock) {
          const dataUrl = await fileToDataUrl(file);
          setState({ uploading: false, progress: 100, error: null });
          return { url: dataUrl };
        }

        // 2. Direct upload to object storage via presigned URL
        const uploadRes = await new Promise<boolean>((resolve) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", data.uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              setState((s) => ({
                ...s,
                progress: Math.round((e.loaded / e.total) * 100),
              }));
            }
          };

          xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
          xhr.onerror = () => resolve(false);
          xhr.send(file);
        });

        if (!uploadRes) {
          throw new Error("Direct upload to storage failed");
        }

        setState({ uploading: false, progress: 100, error: null });
        return { url: data.publicUrl };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setState({ uploading: false, progress: 0, error: msg });
        return null;
      }
    },
    [projectId],
  );

  return { ...state, upload };
}
