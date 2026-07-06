/**
 * Max size for a locally-uploaded file that we inline as a base64 `data:` URL
 * into the canvas. Because the canvas JSON is persisted to the backend, an
 * inlined asset survives a page refresh (unlike a session-scoped `blob:` URL)
 * and needs no `revokeObjectURL` bookkeeping — at the cost of row size, hence
 * the cap. Kept below the backend's per-data-URL limit (see schemas/project.ts).
 */
export const MAX_INLINE_UPLOAD_BYTES = 6 * 1024 * 1024; // 6 MB

export class FileTooLargeError extends Error {
  constructor(readonly size: number) {
    const mb = (size / 1024 / 1024).toFixed(1);
    const limit = MAX_INLINE_UPLOAD_BYTES / 1024 / 1024;
    super(`文件过大（${mb}MB），请压缩到 ${limit}MB 以内再上传`);
    this.name = "FileTooLargeError";
  }
}

/**
 * Read a File into a persistent base64 `data:` URL. Rejects with
 * {@link FileTooLargeError} for files above {@link MAX_INLINE_UPLOAD_BYTES} so
 * callers can surface a friendly message instead of silently producing an
 * asset the backend would reject on save.
 */
export function fileToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_INLINE_UPLOAD_BYTES) {
    return Promise.reject(new FileTooLargeError(file.size));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}
