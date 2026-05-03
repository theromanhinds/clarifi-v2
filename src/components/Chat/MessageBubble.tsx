import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '@/types';

interface MessageBubbleProps {
  message: ChatMessage;
}

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 items-center px-4 py-4">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-text-muted animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isEmpty = !message.content;

  if (!isUser && isEmpty) {
    return (
      <div className="flex justify-start mb-5">
        <div className="bg-surface border border-border rounded-2xl max-w-[88%]">
          <TypingIndicator />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[88%] rounded-2xl px-5 py-4 leading-relaxed
          ${isUser
            ? 'bg-accent-blue text-white text-base'
            : 'bg-surface border border-border text-text-primary text-base'
          }
        `}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className={`
            prose prose-invert max-w-none
            [&_p]:text-base [&_p]:leading-7 [&_p]:mb-3 [&_p:last-child]:mb-0
            [&_ul]:mb-3 [&_ul]:pl-5 [&_ul:last-child]:mb-0
            [&_ol]:mb-3 [&_ol]:pl-5 [&_ol:last-child]:mb-0
            [&_li]:text-base [&_li]:leading-7 [&_li]:mb-1
            [&_strong]:text-white [&_strong]:font-semibold
            [&_em]:text-text-muted
            [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h1]:mt-4 [&_h1:first-child]:mt-0
            [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2:first-child]:mt-0
            [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3:first-child]:mt-0
            [&_code]:text-base [&_code]:font-mono [&_code]:bg-background [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
            [&_pre]:bg-background [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:mb-3 [&_pre]:overflow-x-auto
            [&_blockquote]:border-l-2 [&_blockquote]:border-accent-blue [&_blockquote]:pl-3 [&_blockquote]:text-text-muted [&_blockquote]:italic
            [&_hr]:border-border [&_hr]:my-3
          `}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
