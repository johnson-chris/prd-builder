import { useState, useRef, useCallback } from 'react';

interface FileUploadInputProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  context: string;
  onContextChange: (text: string) => void;
  gitUrl: string;
  onGitUrlChange: (url: string) => void;
  error?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 20;
const MAX_CONTEXT_CHARS = 2000;
const ACCEPTED_EXTENSIONS = ['.js', '.ts', '.tsx', '.jsx', '.py', '.vbs', '.java', '.cs', '.go', '.rb', '.php', '.sql', '.sh', '.md', '.txt', '.xlsx', '.docx'];

const FILE_ICONS: Record<string, string> = {
  js: '📜', ts: '📘', tsx: '📘', jsx: '📜',
  py: '🐍', vbs: '📝', java: '☕', cs: '💠',
  go: '🔷', rb: '💎', php: '🐘', sql: '🗃️',
  sh: '⚙️', md: '📋', txt: '📄',
  xlsx: '📊', xls: '📊', docx: '📄', doc: '📄',
};

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || '📁';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadInput({
  files,
  onFilesChange,
  context,
  onContextChange,
  gitUrl,
  onGitUrlChange,
  error,
}: FileUploadInputProps): JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showGitUrl, setShowGitUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contextCharCount = context.length;
  const isContextOverLimit = contextCharCount > MAX_CONTEXT_CHARS;

  const handleFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    const fileArray = Array.from(newFiles);

    for (const file of fileArray) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        continue;
      }
      // Check for duplicates
      if (!files.some((f) => f.name === file.name && f.size === file.size)) {
        validFiles.push(file);
      }
    }

    if (files.length + validFiles.length <= MAX_FILES) {
      onFilesChange([...files, ...validFiles]);
    }
  }, [files, onFilesChange]);

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
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    onFilesChange([]);
  };

  return (
    <div className="space-y-4">
      {/* Project Context (collapsible) */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowContext(!showContext)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-stone-700">Add Project Context</span>
            <span className="text-xs text-stone-400">(optional)</span>
          </div>
          <svg
            className={`h-4 w-4 text-stone-400 transition-transform ${showContext ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showContext && (
          <div className="px-4 pb-4 border-t border-stone-100">
            <p className="text-xs text-stone-500 mt-3 mb-2">
              Provide background about the project to help the AI make better extraction decisions.
            </p>
            <textarea
              value={context}
              onChange={(e) => onContextChange(e.target.value)}
              placeholder="e.g., This is a legacy VBA application for inventory management that we're modernizing..."
              rows={3}
              className={`w-full rounded-xl border bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:bg-white focus:outline-none transition-colors resize-none ${
                isContextOverLimit ? 'border-red-300' : 'border-stone-200'
              }`}
            />
            <div className="mt-1 flex justify-end">
              <p className={`text-xs ${isContextOverLimit ? 'text-red-600' : 'text-stone-400'}`}>
                {contextCharCount.toLocaleString()} / {MAX_CONTEXT_CHARS.toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Git URL (collapsible) */}
      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGitUrl(!showGitUrl)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span className="text-sm font-medium text-stone-700">Import from Git Repository</span>
            <span className="text-xs text-stone-400">(optional)</span>
          </div>
          <svg
            className={`h-4 w-4 text-stone-400 transition-transform ${showGitUrl ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showGitUrl && (
          <div className="px-4 pb-4 border-t border-stone-100">
            <p className="text-xs text-stone-500 mt-3 mb-2">
              Enter a public Git repository URL to analyze README, package.json, and project structure.
            </p>
            <input
              type="url"
              value={gitUrl}
              onChange={(e) => onGitUrlChange(e.target.value)}
              placeholder="https://github.com/username/repository"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        )}
      </div>

      {/* File upload zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? 'border-stone-400 bg-stone-100'
            : 'border-stone-200 bg-stone-50 hover:border-stone-300'
        }`}
      >
        <div className="mx-auto w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <p className="text-sm text-stone-600 mb-1">
          Drag and drop files here
        </p>
        <p className="text-xs text-stone-400 mb-3">
          Supports: .js, .ts, .py, .vbs, .java, .cs, .xlsx, .docx, .md, and more
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
        >
          Browse files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-stone-700">
              {files.length} file{files.length !== 1 ? 's' : ''} selected
            </p>
            <button
              type="button"
              onClick={clearAllFiles}
              className="text-xs text-stone-500 hover:text-stone-700 transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}`}
                className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3"
              >
                <span className="text-lg">{getFileIcon(file.name)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700 truncate">{file.name}</p>
                  <p className="text-xs text-stone-400">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {/* Limits info */}
      <p className="text-xs text-stone-400 text-center">
        Max {MAX_FILES} files, {formatFileSize(MAX_FILE_SIZE)} each
      </p>
    </div>
  );
}
