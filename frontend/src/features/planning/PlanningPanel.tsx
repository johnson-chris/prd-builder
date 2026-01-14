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

export function PlanningPanel({ prdId, section, prdTitle, allSections, onClose, onApplySuggestion }: PlanningPanelProps): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
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
      }
    );
  };

  const handleApply = (content: string): void => {
    const codeBlockMatch = content.match(/```(?:html)?\n?([\s\S]*?)```/);
    let cleanContent = codeBlockMatch ? codeBlockMatch[1].trim() : content;
    cleanContent = markdownToHtml(cleanContent);
    onApplySuggestion(cleanContent);
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
              {msg.role === 'assistant' && (
                <button
                  onClick={() => handleApply(msg.content)}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Apply to section
                </button>
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
      </div>
    </div>
  );
}
