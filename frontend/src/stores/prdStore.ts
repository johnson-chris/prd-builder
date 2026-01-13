import { create } from 'zustand';
import type { Prd, PrdListItem, Section, UpdatePrdInput } from '@/types';
import { createDefaultSections } from '@/types';
import { prdApi } from '@/lib/api';
import { storage } from '@/lib/storage';
import { calculateCompleteness } from '@/lib/utils';

interface PrdState {
  prds: PrdListItem[]; totalPrds: number; currentPage: number; isLoadingList: boolean;
  currentPrd: Prd | null; isLoadingPrd: boolean; isSaving: boolean; lastSavedAt: string | null; hasUnsavedChanges: boolean;
  error: string | null;
  fetchPrds: (page?: number) => Promise<void>;
  fetchPrd: (id: string) => Promise<void>;
  createPrd: (title: string) => Promise<Prd>;
  updatePrd: (id: string, data: UpdatePrdInput) => Promise<void>;
  deletePrd: (id: string) => Promise<void>;
  downloadPrd: (id: string) => Promise<Blob>;
  setCurrentPrd: (prd: Prd | null) => void;
  updateSection: (sectionId: string, content: string) => void;
  updateTitle: (title: string) => void;
  updateStatus: (status: Prd['status']) => void;
  saveDraft: () => void;
  clearError: () => void;
}

export const usePrdStore = create<PrdState>((set, get) => ({
  prds: [], totalPrds: 0, currentPage: 1, isLoadingList: false,
  currentPrd: null, isLoadingPrd: false, isSaving: false, lastSavedAt: null, hasUnsavedChanges: false, error: null,

  fetchPrds: async (page = 1) => {
    set({ isLoadingList: true, error: null });
    try {
      const response = await prdApi.list(page);
      set({ prds: response.prds, totalPrds: response.total, currentPage: page, isLoadingList: false });
    } catch (error) { set({ error: error instanceof Error ? error.message : 'Failed to fetch PRDs', isLoadingList: false }); }
  },

  fetchPrd: async (id: string) => {
    set({ isLoadingPrd: true, error: null });
    try {
      const prd = await prdApi.get(id);
      set({ currentPrd: prd, isLoadingPrd: false, hasUnsavedChanges: false, lastSavedAt: prd.updatedAt });
    } catch (error) { set({ error: error instanceof Error ? error.message : 'Failed to fetch PRD', isLoadingPrd: false }); }
  },

  createPrd: async (title: string) => {
    set({ isSaving: true, error: null });
    try {
      const prd = await prdApi.create({ title });
      if (!prd.sections || prd.sections.length === 0) prd.sections = createDefaultSections();
      set({ currentPrd: prd, isSaving: false, hasUnsavedChanges: false, lastSavedAt: prd.updatedAt });
      return prd;
    } catch (error) { set({ error: error instanceof Error ? error.message : 'Failed to create PRD', isSaving: false }); throw error; }
  },

  updatePrd: async (id: string, data: UpdatePrdInput) => {
    set({ isSaving: true, error: null });
    try {
      const prd = await prdApi.update(id, data);
      set({ currentPrd: prd, isSaving: false, hasUnsavedChanges: false, lastSavedAt: prd.updatedAt });
      storage.clearDraft(id);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to save PRD', isSaving: false });
      throw error;
    }
  },

  deletePrd: async (id: string) => {
    try {
      await prdApi.delete(id);
      set((state) => ({ prds: state.prds.filter((p) => p.id !== id), totalPrds: state.totalPrds - 1, currentPrd: state.currentPrd?.id === id ? null : state.currentPrd }));
      storage.clearDraft(id);
    } catch (error) { set({ error: error instanceof Error ? error.message : 'Failed to delete PRD' }); throw error; }
  },

  downloadPrd: async (id: string) => {
    try { return await prdApi.download(id); }
    catch (error) { set({ error: error instanceof Error ? error.message : 'Failed to download PRD' }); throw error; }
  },

  setCurrentPrd: (prd) => set({ currentPrd: prd, hasUnsavedChanges: false, lastSavedAt: prd?.updatedAt ?? null }),

  updateSection: (sectionId, content) => {
    const { currentPrd } = get();
    if (!currentPrd) return;
    const updatedSections = currentPrd.sections.map((s) => s.id === sectionId ? { ...s, content, completed: content.trim().length > 0 } : s);
    set({ currentPrd: { ...currentPrd, sections: updatedSections, completenessScore: calculateCompleteness(updatedSections) }, hasUnsavedChanges: true });
  },

  updateTitle: (title) => { const { currentPrd } = get(); if (currentPrd) set({ currentPrd: { ...currentPrd, title }, hasUnsavedChanges: true }); },
  updateStatus: (status) => { const { currentPrd } = get(); if (currentPrd) set({ currentPrd: { ...currentPrd, status }, hasUnsavedChanges: true }); },
  saveDraft: () => { const { currentPrd } = get(); if (currentPrd) storage.saveDraft(currentPrd.id, currentPrd); },
  clearError: () => set({ error: null }),
}));
