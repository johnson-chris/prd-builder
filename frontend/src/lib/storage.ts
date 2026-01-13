import type { Prd, PrdSection } from '@/types';

const STORAGE_KEYS = { DRAFT_PREFIX: 'prd_draft_', NEW_DRAFT: 'prd_new_draft', LAST_EDITED: 'prd_last_edited' } as const;

export interface DraftData { prd: Partial<Prd>; savedAt: string; }
export interface NewDraftData { title: string; sections: PrdSection[]; savedAt: string; }

export const storage = {
  saveDraft: (prdId: string, prd: Partial<Prd>): void => {
    try {
      localStorage.setItem(`${STORAGE_KEYS.DRAFT_PREFIX}${prdId}`, JSON.stringify({ prd, savedAt: new Date().toISOString() }));
      localStorage.setItem(STORAGE_KEYS.LAST_EDITED, prdId);
    } catch (error) { console.error('Failed to save draft:', error); }
  },
  getDraft: (prdId: string): DraftData | null => {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.DRAFT_PREFIX}${prdId}`);
      return data ? JSON.parse(data) as DraftData : null;
    } catch (error) { console.error('Failed to get draft:', error); return null; }
  },
  clearDraft: (prdId: string): void => { try { localStorage.removeItem(`${STORAGE_KEYS.DRAFT_PREFIX}${prdId}`); } catch { } },
};

// Standalone functions for new PRD drafts
export function saveDraft(data: { title: string; sections: PrdSection[] }): void {
  try {
    localStorage.setItem(STORAGE_KEYS.NEW_DRAFT, JSON.stringify({ ...data, savedAt: new Date().toISOString() }));
  } catch (error) { console.error('Failed to save new draft:', error); }
}

export function loadDraft(): NewDraftData | null {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.NEW_DRAFT);
    return data ? JSON.parse(data) as NewDraftData : null;
  } catch (error) { console.error('Failed to load new draft:', error); return null; }
}

export function clearDraft(): void {
  try { localStorage.removeItem(STORAGE_KEYS.NEW_DRAFT); } catch { }
}
