import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bold, Italic, Underline, Link2, List, ListOrdered, Heading1, Heading2, Code2, Eye, FileCode, Columns2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mode = 'split' | 'visual' | 'source';

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholders?: string[];
  minHeight?: number;
}

export function HtmlTemplateEditor({ value, onChange, placeholders = [], minHeight = 300 }: Props) {
  const { i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const [mode, setMode] = useState<Mode>('split');
  const previewRef = useRef<HTMLDivElement | null>(null);
  // Track which pane originated the latest change so we don't fight ourselves
  const sourceRef = useRef<'visual' | 'code' | null>(null);

  // When `value` changes from the outside (e.g., another field), sync preview
  useEffect(() => {
    if (sourceRef.current === 'visual') {
      sourceRef.current = null;
      return;
    }
    if (previewRef.current && previewRef.current.innerHTML !== value) {
      previewRef.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    previewRef.current?.focus();
    try {
      document.execCommand(command, false, arg);
    } catch { /* noop */ }
    if (previewRef.current) {
      sourceRef.current = 'visual';
      onChange(previewRef.current.innerHTML);
    }
  };

  const insertText = (text: string) => {
    if (mode === 'source') {
      onChange((value || '') + text);
      return;
    }
    previewRef.current?.focus();
    try {
      document.execCommand('insertText', false, text);
    } catch { /* noop */ }
    if (previewRef.current) {
      sourceRef.current = 'visual';
      onChange(previewRef.current.innerHTML);
    }
  };

  const handleVisualInput = (e: React.FormEvent<HTMLDivElement>) => {
    sourceRef.current = 'visual';
    onChange((e.currentTarget as HTMLDivElement).innerHTML);
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    sourceRef.current = 'code';
    onChange(e.target.value);
    // Reflect changes immediately in preview
    if (previewRef.current) {
      previewRef.current.innerHTML = e.target.value;
    }
  };

  const tools: Array<{ icon: any; cmd: string; arg?: string; title: string }> = [
    { icon: Bold,        cmd: 'bold',       title: isRtl ? 'عريض' : 'Bold' },
    { icon: Italic,      cmd: 'italic',     title: isRtl ? 'مائل' : 'Italic' },
    { icon: Underline,   cmd: 'underline',  title: isRtl ? 'تسطير' : 'Underline' },
    { icon: Heading1,    cmd: 'formatBlock', arg: 'H1', title: 'H1' },
    { icon: Heading2,    cmd: 'formatBlock', arg: 'H2', title: 'H2' },
    { icon: List,        cmd: 'insertUnorderedList', title: isRtl ? 'قائمة' : 'Bullet list' },
    { icon: ListOrdered, cmd: 'insertOrderedList',   title: isRtl ? 'قائمة مرقمة' : 'Numbered list' },
  ];

  return (
    <div className="rounded-xl border border-border-subtle overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-1 p-2 bg-slate-50 border-b border-border-subtle">
        {tools.map((t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => exec(t.cmd, t.arg)}
            disabled={mode === 'source'}
            title={t.title}
            className="w-8 h-8 rounded-md hover:bg-white border border-transparent hover:border-border-subtle disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 flex items-center justify-center"
          >
            <t.icon className="w-3.5 h-3.5" />
          </button>
        ))}

        <button
          type="button"
          title={isRtl ? 'إضافة رابط' : 'Insert link'}
          onClick={() => {
            const url = window.prompt(isRtl ? 'أدخل الرابط:' : 'Enter URL:');
            if (url) exec('createLink', url);
          }}
          disabled={mode === 'source'}
          className="w-8 h-8 rounded-md hover:bg-white border border-transparent hover:border-border-subtle disabled:opacity-40 text-slate-700 flex items-center justify-center"
        >
          <Link2 className="w-3.5 h-3.5" />
        </button>

        <div className="mx-2 w-px h-6 bg-border-subtle" />

        {/* Mode switcher */}
        <div className="flex items-center gap-0.5 bg-white rounded-md p-0.5 border border-border-subtle">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={cn('px-2 h-7 rounded text-[11px] font-bold flex items-center gap-1', mode === 'visual' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100')}
            title={isRtl ? 'معاينة فقط' : 'Visual only'}
          >
            <Eye className="w-3 h-3" />
            {isRtl ? 'معاينة' : 'Visual'}
          </button>
          <button
            type="button"
            onClick={() => setMode('split')}
            className={cn('px-2 h-7 rounded text-[11px] font-bold flex items-center gap-1', mode === 'split' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100')}
            title={isRtl ? 'تقسيم' : 'Split'}
          >
            <Columns2 className="w-3 h-3" />
            {isRtl ? 'تقسيم' : 'Split'}
          </button>
          <button
            type="button"
            onClick={() => setMode('source')}
            className={cn('px-2 h-7 rounded text-[11px] font-bold flex items-center gap-1', mode === 'source' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100')}
            title={isRtl ? 'كود HTML' : 'HTML source'}
          >
            <FileCode className="w-3 h-3" />
            HTML
          </button>
        </div>

        {/* Placeholders dropdown-like quick insert */}
        {placeholders.length > 0 && (
          <div className="ml-auto rtl:ml-0 rtl:mr-auto flex items-center gap-1 flex-wrap max-w-full">
            <span className="text-[10px] font-bold text-slate-500 px-1">
              {isRtl ? 'متغيرات:' : 'Variables:'}
            </span>
            {placeholders.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => insertText(p)}
                className="px-1.5 h-6 rounded text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                title={isRtl ? 'إدراج' : 'Insert'}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Panes */}
      <div
        className={cn(
          'grid',
          mode === 'split' ? 'grid-cols-1 md:grid-cols-2 divide-x rtl:divide-x-reverse divide-border-subtle' : 'grid-cols-1'
        )}
      >
        {(mode === 'source' || mode === 'split') && (
          <div className="flex flex-col">
            <div className="px-3 py-1.5 bg-slate-50/60 border-b border-border-subtle text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Code2 className="w-3 h-3" /> HTML
            </div>
            <textarea
              value={value}
              onChange={handleSourceChange}
              spellCheck={false}
              dir="ltr"
              style={{ minHeight }}
              className="w-full p-3 text-[12px] font-mono resize-y outline-none bg-slate-50/30 text-slate-800"
            />
          </div>
        )}

        {(mode === 'visual' || mode === 'split') && (
          <div className="flex flex-col">
            <div className="px-3 py-1.5 bg-slate-50/60 border-b border-border-subtle text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Eye className="w-3 h-3" /> {isRtl ? 'معاينة قابلة للتعديل' : 'Editable Preview'}
            </div>
            <div
              ref={previewRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleVisualInput}
              dir={isRtl ? 'rtl' : 'ltr'}
              style={{ minHeight }}
              className="prose prose-sm max-w-none p-4 outline-none focus:bg-white text-[13px] leading-relaxed"
            />
          </div>
        )}
      </div>
    </div>
  );
}
