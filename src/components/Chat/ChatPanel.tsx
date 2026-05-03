import { useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

const SAMPLE_PROMPTS = [
  'Am I on track to afford a vacation this summer?',
  'What would happen if I cut dining out by $200/month?',
  'When will my balance drop below $1,000?',
  'What are my biggest spending blind spots?',
];

export function ChatPanel() {
  const { messages, isThinking, sendMessage } = useApp();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Is the last assistant message still streaming (empty)?
  const isStreaming =
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    messages[messages.length - 1].content === '';

  const isDisabled = isThinking || isStreaming;

  // Show prompts when only the welcome message exists
  const showPrompts = messages.length <= 1;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex-shrink-0">
        <h2 className="text-text-primary text-sm font-medium">Chat with Claire</h2>
        <p className="text-text-muted text-xs">Powered by Gemini 2.5 Flash</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-2">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Sample prompts — only when conversation hasn't started */}
        {showPrompts && !isDisabled && (
          <div className="mt-4 mb-2">
            <p className="text-text-muted text-xs uppercase tracking-wider mb-3">Try asking…</p>
            <div className="flex flex-col gap-2">
              {SAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-sm text-text-muted border border-border rounded-xl px-4 py-3 hover:border-accent-blue hover:text-text-primary transition-all duration-150 bg-surface"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <ChatInput onSend={sendMessage} disabled={isDisabled} />
      </div>
    </div>
  );
}
