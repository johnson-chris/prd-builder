import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui';
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
    // Scroll only within the messages container, not the entire page
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
    // Extract content from markdown code blocks if present
    const codeBlockMatch = content.match(/```(?:html)?\n?([\s\S]*?)```/);
    let cleanContent = codeBlockMatch ? codeBlockMatch[1].trim() : content;

    // Convert markdown to HTML for TipTap
    cleanContent = markdownToHtml(cleanContent);
    onApplySuggestion(cleanContent);
  };

  // Simple markdown to HTML converter
  const markdownToHtml = (md: string): string => {
    let html = md;

    // Convert headers (### Header -> <h3>Header</h3>)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Convert bold (**text** -> <strong>text</strong>)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Convert italic (*text* -> <em>text</em>)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Convert unordered lists
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
        // Convert line breaks to paragraphs for non-empty, non-HTML lines
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
    <div className="w-96 flex-shrink-0 rounded-lg border border-border bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="font-semibold text-primary">AI Planning Assistant</h3>
          <p className="text-xs text-text-muted">{section.title}</p>
        </div>
        <button onClick={onClose} className="rounded p-1 text-text-muted hover:bg-gray-100">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div ref={messagesContainerRef} className="h-96 overflow-y-auto p-4">
        {messages.length === 0 && !streaming && (
          <div className="space-y-2">
            <p className="text-sm text-text-muted mb-3">Quick prompts:</p>
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => setInput(prompt)}
                className="block w-full rounded-md bg-gray-50 px-3 py-2 text-left text-sm text-primary hover:bg-gray-100"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.role === 'user' ? 'text-right' : ''}`}>
            <div
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-accent text-white'
                  : 'bg-gray-100 text-primary'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === 'assistant' && (
                <button
                  onClick={() => handleApply(msg.content)}
                  className="mt-2 text-xs text-accent hover:underline"
                >
                  Apply to section
                </button>
              )}
            </div>
          </div>
        ))}

        {streaming && currentResponse && (
          <div className="mb-4">
            <div className="inline-block max-w-[85%] rounded-lg bg-gray-100 px-3 py-2 text-sm text-primary">
              <div className="whitespace-pre-wrap">{currentResponse}</div>
              <span className="inline-block h-4 w-1 animate-pulse bg-accent" />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask for suggestions..."
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            disabled={streaming}
          />
          <Button
            variant="accent"
            size="sm"
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            isLoading={streaming}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
