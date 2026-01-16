export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface FileSource {
  filename: string;
  excerpt?: string;
}

export interface ExtractedSection {
  sectionId: string;
  sectionTitle: string;
  content: string;
  confidence: ConfidenceLevel;
  confidenceReason?: string;
  sourceQuotes: string[];  // For transcripts
  sourceFiles: FileSource[]; // For files
  included: boolean;
}

export interface TranscriptAnalysisResult {
  suggestedTitle: string;
  sections: ExtractedSection[];
  analysisNotes: string;
}

export type TranscriptSSEEvent =
  | { type: 'progress'; stage: string; progress: number }
  | { type: 'section'; sectionId: string; sectionTitle: string; content: string; confidence: ConfidenceLevel; confidenceReason?: string; sourceQuotes: string[] }
  | { type: 'complete'; suggestedTitle: string; analysisNotes: string }
  | { type: 'error'; message: string };

export type FilesSSEEvent =
  | { type: 'progress'; stage: string; progress: number }
  | { type: 'section'; sectionId: string; sectionTitle: string; content: string; confidence: ConfidenceLevel; confidenceReason?: string; sourceFiles: FileSource[] }
  | { type: 'complete'; suggestedTitle: string; analysisNotes: string }
  | { type: 'error'; message: string };
