import React from 'react';
import { Input } from '@/components/ui/input';

export function LegalFileUploadField({ value, onChange }: { value?: File | null; onChange: (file: File | null) => void; }) {
  const [error, setError] = React.useState('');
  const [selectedName, setSelectedName] = React.useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setError('');
    if (!file) {
      onChange(null);
      setSelectedName('');
      return;
    }
    const isPdf = file.type === 'application/pdf';
    const isGif = file.type === 'image/gif';
    if (!isPdf && !isGif) {
      setError('يُسمح فقط بملفات PDF و GIF');
      e.target.value = '';
      onChange(null);
      setSelectedName('');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('يجب ألا يتجاوز حجم الملف 2MB');
      e.target.value = '';
      onChange(null);
      setSelectedName('');
      return;
    }
    setSelectedName(file.name);
    onChange(file);
  };

  return (
    <div className="space-y-2">
      <Input type="file" accept=".pdf,.gif,application/pdf,image/gif" onChange={handleChange} className="h-11 rounded-2xl border-border-subtle bg-card text-text-main" />
      {selectedName ? <p className="text-xs text-text-muted">{selectedName}</p> : null}
      {error ? <p className="text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
}

