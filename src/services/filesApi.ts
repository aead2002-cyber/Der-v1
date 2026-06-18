import { apiBaseUrl, ApiError, apiRequest } from './apiClient';
import { tokenStorage } from './tokenStorage';

export interface FileUploadResponse {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface DownloadedFile {
  blob: Blob;
  fileName: string;
  mimeType: string;
}

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / 1024 / 1024;

export const filesApi = {
  uploadFile: async (file: File): Promise<FileUploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<FileUploadResponse>('/api/uploads', {
      method: 'POST',
      body: form,
    });
  },

  downloadFile: async (idOrUrl: string): Promise<DownloadedFile> => {
    const id = extractFileId(idOrUrl);
    if (!id) {
      throw new Error('File id is required');
    }

    const response = await fetch(buildUrl(`/api/files/${encodeURIComponent(id)}`), {
      headers: buildAuthHeaders(),
    });

    if (response.status === 401) {
      tokenStorage.clear();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (!response.ok) {
      const body = await readErrorBody(response);
      throw new ApiError(response.status, extractErrorMessage(body, response.statusText), body);
    }

    const blob = await response.blob();
    return {
      blob,
      fileName: extractFileName(response.headers.get('Content-Disposition')) || id,
      mimeType: response.headers.get('Content-Type') || blob.type || 'application/octet-stream',
    };
  },

  openFile: async (value: string): Promise<void> => {
    if (!value) {
      throw new Error('File URL is required');
    }

    if (!isBackendFileUrl(value)) {
      window.open(resolveFileUrl(value) || value, '_blank', 'noopener,noreferrer');
      return;
    }

    const downloaded = await filesApi.downloadFile(value);
    const objectUrl = URL.createObjectURL(downloaded.blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  },

  deleteFile: async (idOrUrl: string): Promise<void> => {
    const id = extractFileId(idOrUrl);
    if (!id) return;

    const response = await apiRequest<unknown>(`/api/files/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });

    if (response && typeof response === 'object') {
      const result = response as { success?: boolean; error?: string };
      if (result.success === false) {
        throw new Error(result.error || 'File could not be deleted');
      }
    }
  },
};

export const isBackendFileUrl = (value: string): boolean => !!extractFileId(value);

export const resolveFileUrl = (value: string): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/api/files/') || value.startsWith('/uploads/')) {
    return `${apiBaseUrl}${value}`;
  }
  return null;
};

export const extractFileId = (value: string): string | null => {
  if (!value) return null;
  const match = value.match(/\/api\/files\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : null;
};

const buildUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiBaseUrl}${normalizedPath}`;
};

const buildAuthHeaders = (): Headers => {
  const headers = new Headers();
  const token = tokenStorage.getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
};

const readErrorBody = async (response: Response): Promise<unknown> => {
  const text = await response.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const extractErrorMessage = (data: unknown, fallback: string): string => {
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
  }
  return fallback || 'Request failed';
};

const extractFileName = (contentDisposition: string | null): string | null => {
  if (!contentDisposition) return null;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);
  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch ? plainMatch[1] : null;
};
