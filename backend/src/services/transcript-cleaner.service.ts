/**
 * TranscriptCleaner Service
 *
 * Preprocesses meeting transcripts to fit within the 50,000 character limit
 * by removing timestamps, filler words, backchannels, and merging consecutive
 * speaker utterances.
 */

export type FileType = 'txt' | 'vtt';

export interface CleaningOptions {
  targetChars: number;
  preserveTimestamps: boolean;
  aggressive: boolean;
}

export interface CleaningResult {
  content: string;
  originalChars: number;
  finalChars: number;
  reductionPercent: number;
  speakerMap: Record<string, string>;
  minUtteranceLength: number;
  wasProcessed: boolean;
}

interface TranscriptEntry {
  speaker: string;
  text: string;
  timestamp?: string;
}

// Filler word patterns to remove
const FILLER_PATTERNS: RegExp[] = [
  /\b(um|uh|er|ah|oh)\b/gi,
  /\blike,?\s*/gi,
  /\byou know,?\s*/gi,
  /\bI mean,?\s*/gi,
  /\bgonna\b/gi,
  /\bwanna\b/gi,
  /\bgotta\b/gi,
  /\bkinda\b/gi,
  /\bsorta\b/gi,
  /\bactually,?\s*/gi,
  /\bbasically,?\s*/gi,
  /\bjust\s+/gi,
  /\breally\s+/gi,
  /\bso,?\s+/gi,
  /\bwell,?\s+/gi,
  /\bI think\b/gi,
  /\bI guess\b/gi,
];

// Common backchannel responses (short acknowledgments)
const BACKCHANNELS = new Set([
  'yeah',
  'okay',
  'right',
  'yes',
  'no',
  'mm-hmm',
  'uh-huh',
  'sure',
  'alright',
  'got it',
  'yep',
  'nope',
  'cool',
  'nice',
  'good',
  'great',
  'thanks',
  'exactly',
  'correct',
  'true',
  'absolutely',
  'perfect',
  'awesome',
  'gotcha',
  'i see',
  'makes sense',
  'for sure',
  'sounds good',
  'definitely',
  'ok',
  'mhm',
  'hmm',
  'hm',
  'yup',
  'uh huh',
  'mm hmm',
]);

// Common abbreviations for filler replacement
const ABBREVIATIONS: Record<string, string> = {
  'for example': 'e.g.',
  'that is': 'i.e.',
  'in other words': 'i.e.',
  'and so on': 'etc.',
  'et cetera': 'etc.',
  'as soon as possible': 'ASAP',
  'end of day': 'EOD',
  'end of week': 'EOW',
  'to be determined': 'TBD',
  'to be announced': 'TBA',
  'frequently asked questions': 'FAQ',
  'user interface': 'UI',
  'user experience': 'UX',
  'application programming interface': 'API',
  'minimum viable product': 'MVP',
  'key performance indicator': 'KPI',
  'key performance indicators': 'KPIs',
  'return on investment': 'ROI',
  'product requirements document': 'PRD',
  'business requirements document': 'BRD',
};

/**
 * Parse VTT (WebVTT) format transcripts
 */
function parseVTT(content: string): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  const lines = content.split('\n');

  let currentSpeaker = '';
  let currentText = '';
  let currentTimestamp = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip WEBVTT header and empty lines
    if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) {
      continue;
    }

    // Check for timestamp line (e.g., "00:00:01.000 --> 00:00:05.000")
    if (line.includes('-->')) {
      currentTimestamp = line.split('-->')[0].trim();
      continue;
    }

    // Check for cue identifier (numeric only lines)
    if (/^\d+$/.test(line)) {
      continue;
    }

    // Extract speaker if present (e.g., "<v Speaker Name>text" or "Speaker Name: text")
    let speaker = '';
    let text = line;

    // VTT voice span format: <v Speaker Name>text</v>
    const vttVoiceMatch = line.match(/^<v\s+([^>]+)>(.*)$/);
    if (vttVoiceMatch) {
      speaker = vttVoiceMatch[1].trim();
      text = vttVoiceMatch[2].replace(/<\/v>$/, '').trim();
    } else {
      // Common format: "Speaker Name: text"
      const colonMatch = line.match(/^([^:]+):\s*(.*)$/);
      if (colonMatch && colonMatch[1].length < 50) {
        speaker = colonMatch[1].trim();
        text = colonMatch[2].trim();
      }
    }

    if (speaker) {
      // Save previous entry if exists
      if (currentSpeaker && currentText) {
        entries.push({
          speaker: currentSpeaker,
          text: currentText,
          timestamp: currentTimestamp,
        });
      }
      currentSpeaker = speaker;
      currentText = text;
    } else if (currentSpeaker) {
      // Continuation of previous speaker
      currentText += ' ' + text;
    } else {
      // No speaker identified, treat as unknown
      currentSpeaker = 'Unknown';
      currentText = text;
    }
  }

  // Don't forget the last entry
  if (currentSpeaker && currentText) {
    entries.push({
      speaker: currentSpeaker,
      text: currentText,
      timestamp: currentTimestamp,
    });
  }

  return entries;
}

/**
 * Parse plain text transcript format
 * Supports formats like:
 * - "Speaker Name: text"
 * - "[Speaker Name] text"
 * - "Speaker Name (timestamp): text"
 */
function parseTXT(content: string): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  const lines = content.split('\n');

  let currentSpeaker = '';
  let currentText = '';
  let currentTimestamp = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Try different speaker patterns
    let speaker = '';
    let text = '';
    let timestamp = '';

    // Pattern 1: "[Speaker Name] 10:23:45 text" or "[Speaker Name] text"
    const bracketMatch = trimmedLine.match(/^\[([^\]]+)\]\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)?\s*(.*)$/);
    if (bracketMatch) {
      speaker = bracketMatch[1].trim();
      timestamp = bracketMatch[2] || '';
      text = bracketMatch[3].trim();
    }

    // Pattern 2: "Speaker Name (10:23:45): text"
    if (!speaker) {
      const parenMatch = trimmedLine.match(/^([^(]+)\s*\((\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?)\)\s*:\s*(.*)$/);
      if (parenMatch) {
        speaker = parenMatch[1].trim();
        timestamp = parenMatch[2];
        text = parenMatch[3].trim();
      }
    }

    // Pattern 3: "Speaker Name: text"
    if (!speaker) {
      const colonMatch = trimmedLine.match(/^([^:]+):\s*(.*)$/);
      if (colonMatch && colonMatch[1].length < 50 && !colonMatch[1].includes('http')) {
        speaker = colonMatch[1].trim();
        text = colonMatch[2].trim();
      }
    }

    if (speaker) {
      // Save previous entry if exists
      if (currentSpeaker && currentText) {
        entries.push({
          speaker: currentSpeaker,
          text: currentText,
          timestamp: currentTimestamp,
        });
      }
      currentSpeaker = speaker;
      currentText = text;
      currentTimestamp = timestamp;
    } else if (currentSpeaker) {
      // Continuation of previous speaker
      currentText += ' ' + trimmedLine;
    } else {
      // No speaker pattern found, create entry with unknown speaker
      entries.push({
        speaker: 'Unknown',
        text: trimmedLine,
        timestamp: '',
      });
    }
  }

  // Don't forget the last entry
  if (currentSpeaker && currentText) {
    entries.push({
      speaker: currentSpeaker,
      text: currentText,
      timestamp: currentTimestamp,
    });
  }

  return entries;
}

/**
 * Merge consecutive entries from the same speaker
 */
function mergeConsecutiveSpeakers(entries: TranscriptEntry[]): TranscriptEntry[] {
  if (entries.length === 0) return [];

  const merged: TranscriptEntry[] = [];
  let current = { ...entries[0] };

  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    if (entry.speaker === current.speaker) {
      // Same speaker, merge text
      current.text += ' ' + entry.text;
    } else {
      // Different speaker, save current and start new
      merged.push(current);
      current = { ...entry };
    }
  }

  // Don't forget the last one
  merged.push(current);

  return merged;
}

/**
 * Generate short speaker abbreviations
 */
function shortenSpeakerNames(entries: TranscriptEntry[]): {
  entries: TranscriptEntry[];
  speakerMap: Record<string, string>;
} {
  const speakers = [...new Set(entries.map((e) => e.speaker))];
  const speakerMap: Record<string, string> = {};

  // Generate unique abbreviations
  const usedAbbrevs = new Set<string>();

  for (const speaker of speakers) {
    // Try first letter of each word
    const words = speaker.split(/\s+/);
    let abbrev = words.map((w) => w[0]?.toUpperCase() || '').join('');

    // If collision or empty, use first 2-3 chars
    if (!abbrev || usedAbbrevs.has(abbrev)) {
      abbrev = speaker.substring(0, 2).toUpperCase();
    }

    // If still collision, add number
    let counter = 1;
    const baseAbbrev = abbrev;
    while (usedAbbrevs.has(abbrev)) {
      abbrev = baseAbbrev + counter;
      counter++;
    }

    usedAbbrevs.add(abbrev);
    speakerMap[speaker] = abbrev;
  }

  // Apply abbreviations to entries
  const shortenedEntries = entries.map((e) => ({
    ...e,
    speaker: speakerMap[e.speaker] || e.speaker,
  }));

  return { entries: shortenedEntries, speakerMap };
}

/**
 * Remove filler words from text
 */
function removeFillers(text: string): string {
  let cleaned = text;
  for (const pattern of FILLER_PATTERNS) {
    cleaned = cleaned.replace(pattern, ' ');
  }
  return cleaned;
}

/**
 * Clean up punctuation
 */
function cleanPunctuation(text: string): string {
  return text
    .replace(/\.{2,}/g, '.') // Multiple periods to single
    .replace(/,{2,}/g, ',') // Multiple commas to single
    .replace(/\s{2,}/g, ' ') // Multiple spaces to single
    .replace(/\s+([.,!?])/g, '$1') // Remove space before punctuation
    .replace(/([.,!?])([a-zA-Z])/g, '$1 $2') // Add space after punctuation if missing
    .trim();
}

/**
 * Check if text is a backchannel response
 */
function isBackchannel(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[.,!?]/g, '').trim();
  return BACKCHANNELS.has(normalized);
}

/**
 * Apply common abbreviations to reduce character count
 */
function applyAbbreviations(text: string): string {
  let result = text;
  for (const [phrase, abbrev] of Object.entries(ABBREVIATIONS)) {
    const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
    result = result.replace(regex, abbrev);
  }
  return result;
}

/**
 * Build final output from entries
 */
function buildOutput(entries: TranscriptEntry[], preserveTimestamps: boolean): string {
  return entries
    .map((e) => {
      const timestamp = preserveTimestamps && e.timestamp ? ` ${e.timestamp}` : '';
      return `[${e.speaker}]${timestamp} ${e.text}`;
    })
    .join('\n');
}

/**
 * Main cleaning function
 */
export function cleanTranscript(
  content: string,
  fileType: FileType,
  options: Partial<CleaningOptions> = {}
): CleaningResult {
  const opts: CleaningOptions = {
    targetChars: options.targetChars ?? 50000,
    preserveTimestamps: options.preserveTimestamps ?? false,
    aggressive: options.aggressive ?? false,
  };

  const originalChars = content.length;

  // If already under target, skip processing
  if (originalChars <= opts.targetChars) {
    return {
      content,
      originalChars,
      finalChars: originalChars,
      reductionPercent: 0,
      speakerMap: {},
      minUtteranceLength: 0,
      wasProcessed: false,
    };
  }

  // Parse based on file type
  let entries = fileType === 'vtt' ? parseVTT(content) : parseTXT(content);

  // If no structured entries were parsed, try basic line-by-line
  if (entries.length === 0) {
    entries = content.split('\n').filter(l => l.trim()).map(line => ({
      speaker: 'Speaker',
      text: line.trim(),
      timestamp: '',
    }));
  }

  // Merge consecutive same-speaker entries
  entries = mergeConsecutiveSpeakers(entries);

  // Shorten speaker names
  const { entries: shortenedEntries, speakerMap } = shortenSpeakerNames(entries);
  entries = shortenedEntries;

  // Clean each entry: remove fillers and fix punctuation
  entries = entries
    .map((e) => ({
      ...e,
      text: cleanPunctuation(removeFillers(e.text)),
    }))
    .filter((e) => e.text.trim());

  // Build output and progressively filter until target met
  let output = buildOutput(entries, opts.preserveTimestamps);
  let minLength = opts.aggressive ? 10 : 0;

  // Progressively increase minimum utterance length to reduce size
  while (output.length > opts.targetChars && minLength <= 100) {
    minLength += 5;
    entries = entries.filter(
      (e) => !isBackchannel(e.text) && e.text.length >= minLength
    );
    if (entries.length === 0) break;
    output = buildOutput(entries, opts.preserveTimestamps);
  }

  // Apply abbreviations if still over target
  if (output.length > opts.targetChars) {
    output = applyAbbreviations(output);
  }

  // Calculate final stats
  const finalChars = output.length;
  const reductionPercent =
    Math.round((1 - finalChars / originalChars) * 100 * 10) / 10;

  return {
    content: output,
    originalChars,
    finalChars,
    reductionPercent,
    speakerMap,
    minUtteranceLength: minLength,
    wasProcessed: true,
  };
}

/**
 * Detect file type from content or filename
 */
export function detectFileType(content: string, filename?: string): FileType {
  if (filename?.toLowerCase().endsWith('.vtt')) {
    return 'vtt';
  }
  if (content.trim().startsWith('WEBVTT')) {
    return 'vtt';
  }
  return 'txt';
}
