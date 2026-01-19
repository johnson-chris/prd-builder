import { useState, useRef, useEffect } from 'react';
import { planningApi } from '@/lib/api';
import type { PrdSection } from '@/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PlanningPanelProps {
  prdId: string;
  section: PrdSection;
  prdTitle: string;
  allSections: PrdSection[];
  onClose: () => void;
  onApplySuggestion: (content: string) => void;
}

type ApplyMode = 'replace' | 'merge';

export function PlanningPanel({ prdId, section, prdTitle: _prdTitle, allSections: _allSections, onClose, onApplySuggestion }: PlanningPanelProps): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [includeTeamContext, setIncludeTeamContext] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyMode, setApplyMode] = useState<ApplyMode>('replace');
  const [formattedContent, setFormattedContent] = useState('');
  const [isFormatting, setIsFormatting] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, currentResponse]);

  const sendMessage = async (): Promise<void> => {
    if (!input.trim() || streaming) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setStreaming(true);
    setCurrentResponse('');

    let fullResponse = '';

    planningApi.sendMessage(
      prdId,
      section.id,
      userMessage,
      (chunk) => {
        fullResponse += chunk;
        setCurrentResponse(fullResponse);
      },
      () => {
        setMessages((prev) => [...prev, { role: 'assistant', content: fullResponse }]);
        setCurrentResponse('');
        setStreaming(false);
      },
      (error) => {
        console.error('Planning API error:', error);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
        ]);
        setStreaming(false);
      },
      { includeTeamContext }
    );
  };

  const handleApplyClick = (): void => {
    setShowApplyModal(true);
    setFormattedContent('');
  };

  const handleFormatAndApply = (mode: ApplyMode): void => {
    setApplyMode(mode);
    setIsFormatting(true);
    setFormattedContent('');

    let content = '';
    planningApi.formatForSection(
      prdId,
      section.id,
      messages,
      mode,
      (chunk) => {
        content += chunk;
        setFormattedContent(content);
      },
      () => {
        setIsFormatting(false);
      },
      (error) => {
        console.error('Format error:', error);
        setIsFormatting(false);
        setFormattedContent('Error formatting content. Please try again.');
      }
    );
  };

  const handleConfirmApply = (): void => {
    const htmlContent = markdownToHtml(formattedContent);
    onApplySuggestion(htmlContent);
    setShowApplyModal(false);
    setFormattedContent('');
  };

  const handleCancelApply = (): void => {
    setShowApplyModal(false);
    setFormattedContent('');
  };

  const markdownToHtml = (md: string): string => {
    let html = md;
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    const lines = html.split('\n');
    let inList = false;
    const processedLines: string[] = [];

    for (const line of lines) {
      const listMatch = line.match(/^[-*] (.+)$/);
      if (listMatch) {
        if (!inList) {
          processedLines.push('<ul>');
          inList = true;
        }
        processedLines.push(`<li>${listMatch[1]}</li>`);
      } else {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (line.trim() && !line.startsWith('<')) {
          processedLines.push(`<p>${line}</p>`);
        } else if (line.trim()) {
          processedLines.push(line);
        }
      }
    }
    if (inList) {
      processedLines.push('</ul>');
    }
    return processedLines.join('');
  };

  const quickPrompts = [
    'Help me get started with this section',
    'What are the key points I should cover?',
    'Can you suggest improvements to my current content?',
    'Give me an example of what this section should look like',
  ];

  return (
    <div className="w-96 flex-shrink-0 rounded-2xl border-2 border-stone-200 bg-white shadow-xl animate-fade-in-up" style={{ animationFillMode: 'both' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <div>
          <h3 className="font-semibold text-stone-900">AI Planning Assistant</h3>
          <p className="text-xs text-stone-400 mt-0.5">{section.title}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="h-96 overflow-y-auto p-5">
        {messages.length === 0 && !streaming && (
          <div className="space-y-2">
            <p className="text-sm text-stone-500 mb-4">Quick prompts:</p>
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="block w-full rounded-xl bg-stone-50 border border-stone-100 px-4 py-3 text-left text-sm text-stone-700 hover:bg-stone-100 hover:border-stone-200 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
            <div
              className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-800'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === 'assistant' && messages.length > 0 && (
                <div className="mt-3 text-xs text-stone-400">
                  Use the "Summarize & Apply" button below to apply conversation insights
                </div>
              )}
            </div>
          </div>
        ))}

        {streaming && currentResponse && (
          <div className="mb-4">
            <div className="inline-block max-w-[85%] rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-800">
              <div className="whitespace-pre-wrap">{currentResponse}</div>
              <span className="inline-block h-4 w-1 animate-pulse bg-stone-900 ml-1" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-stone-100 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask for suggestions..."
            className="flex-1 rounded-xl border-2 border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-400 focus:bg-white focus:outline-none transition-colors"
            disabled={streaming}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            className="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {streaming ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-stone-500 cursor-pointer">
            <input
              type="checkbox"
              checked={includeTeamContext}
              onChange={(e) => setIncludeTeamContext(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-stone-300 text-stone-900 focus:ring-stone-500"
            />
            Include team context
          </label>
          {messages.length > 0 && (
            <button
              onClick={handleApplyClick}
              disabled={streaming}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Summarize & Apply
            </button>
          )}
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-xl animate-fade-in-up max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4">
              <div>
                <h3 className="font-semibold text-stone-900">Apply to Section</h3>
                <p className="text-xs text-stone-500 mt-0.5">{section.title}</p>
              </div>
              <button
                onClick={handleCancelApply}
                className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mode Selection */}
            {!formattedContent && !isFormatting && (
              <div className="p-6">
                <p className="text-sm text-stone-600 mb-4">
                  How would you like to apply the conversation insights to this section?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleFormatAndApply('replace')}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 border-stone-200 p-4 text-center transition-all hover:border-stone-400 hover:bg-stone-50"
                  >
                    <svg className="h-6 w-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    <span className="font-medium text-stone-900">Replace</span>
                    <span className="text-xs text-stone-500">Replace current content with new summary</span>
                  </button>
                  <button
                    onClick={() => handleFormatAndApply('merge')}
                    className="flex flex-col items-center gap-2 rounded-xl border-2 border-stone-200 p-4 text-center transition-all hover:border-stone-400 hover:bg-stone-50"
                  >
                    <svg className="h-6 w-6 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span className="font-medium text-stone-900">Merge</span>
                    <span className="text-xs text-stone-500">Combine with existing content</span>
                  </button>
                </div>
              </div>
            )}

            {/* Formatting/Preview */}
            {(isFormatting || formattedContent) && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="px-6 py-3 border-b border-stone-100 bg-stone-50">
                  <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">
                    {isFormatting ? 'Formatting...' : 'Preview'}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="prose prose-sm prose-stone max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-stone-700 font-sans bg-transparent p-0 m-0">
                      {formattedContent}
                      {isFormatting && <span className="inline-block h-4 w-1 animate-pulse bg-stone-900 ml-1" />}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            {formattedContent && !isFormatting && (
              <div className="flex items-center justify-end gap-3 border-t border-stone-100 px-6 py-4">
                <button
                  onClick={handleCancelApply}
                  className="rounded-xl border-2 border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-all hover:border-stone-300 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmApply}
                  className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-stone-800"
                >
                  Apply to Section
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
