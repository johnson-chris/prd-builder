export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ExtractedSection {
  sectionId: string;
  sectionTitle: string;
  content: string;
  confidence: ConfidenceLevel;
  sourceQuotes: string[];
  included: boolean;
}

export interface TranscriptAnalysisResult {
  suggestedTitle: string;
  sections: ExtractedSection[];
  analysisNotes: string;
}

export type TranscriptSSEEvent =
  | { type: 'progress'; stage: string; progress: number }
  | { type: 'section'; sectionId: string; sectionTitle: string; content: string; confidence: ConfidenceLevel; sourceQuotes: string[] }
  | { type: 'complete'; suggestedTitle: string; analysisNotes: string }
  | { type: 'error'; message: string };
