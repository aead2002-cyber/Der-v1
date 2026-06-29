// Shared backend file helpers for uploads and attachment URL resolution.
// Keep behavior identical so existing upload/display flows do not change.

// Base origin for the backend API. Configure via VITE_API_URL in .env.
// Example: VITE_API_URL=http://192.168.1.50:4000
export const apiOrigin: string =
  (import.meta as any).env?.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
export const apiUrl: string = `${apiOrigin}/api`;

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB â€” must match server config
export const MAX_UPLOAD_MB = MAX_UPLOAD_BYTES / 1024 / 1024;

export const uploadFile = async (file: File): Promise<{ url: string; name: string } | null> => {
  if (file.size > MAX_UPLOAD_BYTES) {
    const lang = (typeof window !== 'undefined' ? (window as any).i18nLang : 'ar');
    const msg = lang === 'en'
      ? `File "${file.name}" exceeds the maximum allowed size of ${MAX_UPLOAD_MB} MB`
      : `ط§ظ„ظ…ظ„ظپ "${file.name}" ظٹطھط¬ط§ظˆط² ط§ظ„ط­ط¯ ط§ظ„ط£ظ‚طµظ‰ ط§ظ„ظ…ط³ظ…ظˆط­ ط¨ظ‡ (${MAX_UPLOAD_MB} ظ…ظٹط¬ط§ط¨ط§ظٹطھ)`;
    try { (await import('sonner')).toast.error(msg); } catch { /* noop */ }
    console.error('[upload] file too large:', file.name, file.size);
    return null;
  }
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch(`${apiUrl}/uploads`, { method: 'POST', body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let serverMsg = '';
      try { serverMsg = JSON.parse(text).error || ''; } catch { /* noop */ }
      console.error('[upload] failed', res.status, serverMsg || text);
      try { (await import('sonner')).toast.error(serverMsg || `Upload failed (${res.status})`); } catch { /* noop */ }
      return null;
    }
    const data = await res.json();
    // Store the relative path (e.g. "/api/files/<id>") rather than the absolute
    // URL. `resolveAttachmentUrl` prepends the current apiOrigin at display
    // time, so photos remain valid when the system is moved to another server.
    return { url: data.url as string, name: data.name };
  } catch (err) {
    console.error('[upload] error', err);
    return null;
  }
};

export const resolveAttachmentUrl = (value: string): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/api/files/')) return `${apiOrigin}${value}`;
  return null;
};
