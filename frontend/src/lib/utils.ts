import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string { return clsx(inputs); }

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date));
}

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => fn(...args), delay); };
}

export function calculateCompleteness(sections: { content: string; required: boolean }[]): number {
  const requiredSections = sections.filter((s) => s.required);
  if (requiredSections.length === 0) return 100;
  return Math.round((requiredSections.filter((s) => s.content.trim().length > 0).length / requiredSections.length) * 100);
}
