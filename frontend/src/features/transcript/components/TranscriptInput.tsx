import { useState, useRef, useCallback } from 'react';

interface TranscriptInputProps {
  value: string;
  onChange: (text: string) => void;
  error?: string;
}

const MAX_CHARS = 50000;
const MIN_CHARS = 100;
const ACCEPTED_EXTENSIONS = ['.txt', '.vtt'];

function parseVttToText(vttContent: string): string {
  const lines = vttContent.split('\n');
  const textLines: string[] = [];
  let skipNext = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip WEBVTT header and metadata
    if (trimmed === 'WEBVTT' || trimmed.startsWith('NOTE') || trimmed === '') {
      continue;
    }

    // Skip timestamp lines (e.g., "00:00:01.000 --> 00:00:04.000")
    if (trimmed.includes('-->')) {
      skipNext = false;
      continue;
    }

    // Skip cue identifiers (numeric or named)
    if (/^\d+$/.test(trimmed) || /^[a-zA-Z0-9-]+$/.test(trimmed)) {
      // Could be a cue identifier, check if next line has timestamp
      continue;
    }

    // This is actual caption text - clean up VTT tags
    let cleanText = trimmed
      .replace(/<[^>]+>/g, '') // Remove HTML-like tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    if (cleanText) {
      textLines.push(cleanText);
    }
  }

  // Join lines, combining consecutive lines that form sentences
  return textLines.join(' ').replace(/\s+/g, ' ').trim();
}

export function TranscriptInput({ value, onChange, error }: TranscriptInputProps): JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const charCount = value.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isUnderLimit = charCount > 0 && charCount < MIN_CHARS;

  const handleFile = useCallback((file: File) => {
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      let text = e.target?.result as string;

      // Parse VTT files to extract just the text
      if (extension === '.vtt') {
        text = parseVttToText(text);
      }

      onChange(text);
      setFileName(file.name);
    };
    reader.readAsText(file);
  }, [onChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setFileName(null);
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* File upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-stone-400 bg-stone-100'
            : fileName
            ? 'border-stone-300 bg-white'
            : 'border-stone-200 bg-stone-50 hover:border-stone-300'
        }`}
      >
        {fileName ? (
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium text-stone-700">{fileName}</span>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <div className="mx-auto w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-sm text-stone-600 mb-1">
              Drag and drop a <span className="font-medium">.txt</span> or <span className="font-medium">.vtt</span> file here
            </p>
            <p className="text-xs text-stone-400">or</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              Browse files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.vtt"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-stone-200" />
        <span className="text-xs text-stone-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>

      {/* Text area */}
      <div>
        <textarea
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setFileName(null);
          }}
          placeholder="Paste your meeting transcript here..."
          rows={10}
          className={`w-full rounded-2xl border-2 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:bg-white focus:outline-none transition-colors resize-none ${
            isOverLimit || error ? 'border-red-300' : 'border-stone-200'
          }`}
        />
        <div className="mt-2 flex items-center justify-between">
          <div>
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
            {isUnderLimit && !error && (
              <p className="text-xs text-amber-600">
                Minimum {MIN_CHARS} characters required ({MIN_CHARS - charCount} more needed)
              </p>
            )}
          </div>
          <p className={`text-xs ${isOverLimit ? 'text-red-600' : 'text-stone-400'}`}>
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
          </p>
        </div>
      </div>
    </div>
  );
}
