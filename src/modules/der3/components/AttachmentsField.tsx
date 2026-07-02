import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Paperclip, Plus, X, Clock, Eye } from 'lucide-react';
import { filesApi, resolveFileUrl } from '@/services/filesApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AttachmentsFieldProps {
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
  multiple?: boolean;
}

export function AttachmentsField({ value, onChange, label, multiple = true }: AttachmentsFieldProps) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [uploading, setUploading] = useState(false);

  const labelText = label || (isRtl ? 'ط§ظ„ظ…ط±ظپظ‚ط§طھ' : 'Attachments');

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const next: string[] = [...value];
    for (const file of Array.from(files)) {
      try {
        const uploaded = await filesApi.uploadFile(file);
        next.push(uploaded.url);
      } catch {
        toast.error(isRtl ? `فشل رفع: ${file.name}` : `Upload failed: ${file.name}`);
      }
    }
    setUploading(false);
    onChange(next);
  };
  const labelOf = (val: string) => {
    if (!val) return '';
    if (val.startsWith('/api/files/') || /^https?:\/\//i.test(val)) {
      const parts = val.split('/');
      return parts[parts.length - 1].replace(/^\d+-[a-f0-9]+-/, '');
    }
    return val;
  };

  const open = (val: string) => {
    const url = resolveFileUrl(val) || val;
    if (url) {
      filesApi.openFile(val).catch(() => toast.error(isRtl ? 'تعذر فتح المرفق' : 'Could not open attachment'));
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-text-main flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-primary" />
        {labelText}
        {value.length > 0 && (
          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            {value.length}
          </span>
        )}
      </label>
      <div className="flex flex-wrap gap-2 items-center">
        {value.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            className="group flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-3 h-10 transition-colors"
          >
            <button
              type="button"
              onClick={() => open(url)}
              className="text-[12px] font-medium text-text-main hover:text-primary flex items-center gap-1.5 max-w-[200px] truncate"
              title={labelOf(url)}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{labelOf(url)}</span>
            </button>
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== idx))}
              className="text-rose-500 hover:text-rose-700 opacity-60 hover:opacity-100 transition-opacity"
              title={isRtl ? 'ط­ط°ظپ' : 'Remove'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <label className={cn(
          'border-dashed border-2 h-10 border-slate-300 text-slate-500 hover:text-primary hover:border-primary font-bold bg-white inline-flex items-center gap-2 px-4 rounded-lg cursor-pointer text-sm transition-colors',
          uploading && 'opacity-60 pointer-events-none'
        )}>
          {uploading ? <Clock className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {isRtl ? 'ط¥ط¶ط§ظپط© ظ…ط±ظپظ‚' : 'Add Attachment'}
          <input
            type="file"
            multiple={multiple}
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );
}





