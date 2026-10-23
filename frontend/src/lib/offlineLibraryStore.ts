import { EducationalResource } from "./api";

const DB_NAME = "nurtureher_offline_library";
const DB_VERSION = 1;
const STORE_NAME = "offline_resources";

export interface OfflineResourceRecord {
  id: string;
  title: string;
  description: string;
  content_type: "video" | "article";
  language?: string;
  series_name?: string | null;
  is_verified?: boolean;
  category: string;
  video_url?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  file_size_bytes?: number | null;
  article_content?: string | null;
  author_publisher?: string | null;
  review_date?: string | null;
  sources_json?: string | null;
  is_downloadable: boolean;
  download_status: "downloading" | "completed" | "failed" | "interrupted";
  downloaded_at?: string;
  download_progress?: number;
  downloaded_bytes?: number;
  error_message?: string;
  video_blob?: Blob;
}

// In-memory fallback if IndexedDB is blocked or running in an unsupported environment
const memoryFallback = new Map<string, OfflineResourceRecord>();

function isIndexedDBAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window && window.indexedDB !== null;
}

export function openOfflineDB(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available in this environment"));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("content_type", "content_type", { unique: false });
        store.createIndex("category", "category", { unique: false });
        store.createIndex("download_status", "download_status", { unique: false });
        store.createIndex("downloaded_at", "downloaded_at", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });
}

export async function getAllOfflineRecords(): Promise<OfflineResourceRecord[]> {
  if (!isIndexedDBAvailable()) {
    return Array.from(memoryFallback.values());
  }

  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error || new Error("Failed to read offline resources"));
    });
  } catch {
    return Array.from(memoryFallback.values());
  }
}

export async function getOfflineRecord(id: string): Promise<OfflineResourceRecord | null> {
  if (!isIndexedDBAvailable()) {
    return memoryFallback.get(id) || null;
  }

  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error(`Failed to get offline resource ${id}`));
    });
  } catch {
    return memoryFallback.get(id) || null;
  }
}

export async function putOfflineRecord(record: OfflineResourceRecord): Promise<void> {
  if (!isIndexedDBAvailable()) {
    memoryFallback.set(record.id, record);
    return;
  }

  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("Failed to save offline resource"));
    });
  } catch {
    memoryFallback.set(record.id, record);
  }
}

export async function removeOfflineResource(id: string): Promise<void> {
  memoryFallback.delete(id);

  if (!isIndexedDBAvailable()) {
    return;
  }

  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error(`Failed to delete offline resource ${id}`));
    });
  } catch {
    // Memory fallback was already cleared
  }
}

/**
 * Saves a full article and its rich clinical content locally for offline reading.
 */
export async function saveArticleForOffline(resource: EducationalResource): Promise<OfflineResourceRecord> {
  const record: OfflineResourceRecord = {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    content_type: "article",
    language: resource.language || "en",
    series_name: resource.series_name,
    is_verified: resource.is_verified,
    category: resource.category,
    thumbnail_url: resource.thumbnail_url,
    article_content: resource.article_content || "",
    author_publisher: resource.author_publisher,
    review_date: resource.review_date,
    sources_json: resource.sources_json,
    is_downloadable: resource.is_downloadable,
    download_status: "completed",
    download_progress: 100,
    file_size_bytes: new Blob([resource.article_content || ""]).size,
    downloaded_bytes: new Blob([resource.article_content || ""]).size,
    downloaded_at: new Date().toISOString(),
  };

  await putOfflineRecord(record);
  return record;
}

/**
 * Downloads a permitted video file with real-time stream chunking, progress tracking,
 * and saves the resulting Blob directly to IndexedDB for offline playback.
 */
export async function downloadVideoForOffline(
  resource: EducationalResource,
  onProgress?: (progressPct: number, loadedBytes: number, totalBytes: number) => void,
  signal?: AbortSignal,
): Promise<OfflineResourceRecord> {
  if (!resource.video_url) {
    throw new Error("This video does not have an approved downloadable source file.");
  }

  // Initial downloading state record
  const initialRecord: OfflineResourceRecord = {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    content_type: "video",
    language: resource.language || "en",
    series_name: resource.series_name,
    is_verified: resource.is_verified,
    category: resource.category,
    video_url: resource.video_url,
    thumbnail_url: resource.thumbnail_url,
    duration_seconds: resource.duration_seconds,
    file_size_bytes: resource.file_size_bytes,
    author_publisher: resource.author_publisher,
    review_date: resource.review_date,
    sources_json: resource.sources_json,
    is_downloadable: resource.is_downloadable,
    download_status: "downloading",
    download_progress: 0,
    downloaded_bytes: 0,
  };
  await putOfflineRecord(initialRecord);

  try {
    const response = await fetch(resource.video_url, { signal });
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status} ${response.statusText}`);
    }

    const contentLengthHeader = response.headers.get("Content-Length");
    const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : resource.file_size_bytes || 0;

    let receivedBytes = 0;
    const chunks: Uint8Array[] = [];

    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        if (signal?.aborted) {
          throw new DOMException("Download was paused or cancelled by user", "AbortError");
        }

        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          receivedBytes += value.length;
          const pct = totalBytes > 0 ? Math.min(100, Math.round((receivedBytes / totalBytes) * 100)) : 50;
          if (onProgress) onProgress(pct, receivedBytes, totalBytes);
        }
      }
    } else {
      const blobData = await response.blob();
      chunks.push(new Uint8Array(await blobData.arrayBuffer()));
      receivedBytes = blobData.size;
    }

    const videoBlob = new Blob(chunks as unknown as BlobPart[], { type: "video/mp4" });
    if (receivedBytes <= 0 || videoBlob.size <= 0) {
      throw new Error("Downloaded video file is empty or corrupted.");
    }

    const completedRecord: OfflineResourceRecord = {
      ...initialRecord,
      download_status: "completed",
      download_progress: 100,
      downloaded_bytes: receivedBytes,
      file_size_bytes: totalBytes || receivedBytes,
      downloaded_at: new Date().toISOString(),
      video_blob: videoBlob,
    };

    await putOfflineRecord(completedRecord);
    if (onProgress) onProgress(100, receivedBytes, totalBytes || receivedBytes);
    return completedRecord;
  } catch (err: unknown) {
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    const failedRecord: OfflineResourceRecord = {
      ...initialRecord,
      download_status: isAbort ? "interrupted" : "failed",
      error_message: isAbort ? "Download paused/cancelled" : err instanceof Error ? err.message : "Download failed",
    };
    await putOfflineRecord(failedRecord);
    throw err;
  }
}

/**
 * Returns storage usage and quota estimate using browser StorageManager API where supported.
 */
export async function getStorageQuota(): Promise<{ usedBytes: number; quotaBytes: number; percent: number }> {
  if (typeof navigator !== "undefined" && navigator.storage && typeof navigator.storage.estimate === "function") {
    try {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percent = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
      return { usedBytes: used, quotaBytes: quota, percent };
    } catch {
      // Fallback
    }
  }

  // Fallback calculation from stored records
  const records = await getAllOfflineRecords();
  const used = records.reduce((acc, r) => acc + (r.downloaded_bytes || r.file_size_bytes || 0), 0);
  return { usedBytes: used, quotaBytes: 50 * 1024 * 1024 * 1024, percent: 1 };
}

/**
 * Human-readable byte formatting.
 */
export function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Formats duration in seconds to MM:SS or HH:MM:SS.
 */
export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}
