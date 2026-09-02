import { User, Bot } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../../types';

interface Props {
  message: ChatMessageType;
}

function formatContent(content: string) {
  // Handle bullet points and line breaks
  const lines = content.split('\n');
  return lines.map((line, i) => {
    const bulletMatch = line.match(/^[\-\*]\s+(.*)/);
    if (bulletMatch) {
      return (
        <div key={i} className="flex gap-2 ml-1">
          <span className="text-slate-400 mt-0.5 shrink-0">•</span>
          <span>{bulletMatch[1]}</span>
        </div>
      );
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    return <p key={i}>{line}</p>;
  });
}

export default function ChatMessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-600' : 'bg-slate-800'
        }`}
      >
        {isUser ? (
          <User size={14} className="text-white" />
        ) : (
          <Bot size={14} className="text-white" />
        )}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-sm'
              : 'bg-white text-slate-800 rounded-tl-sm shadow-sm border border-slate-100'
          }`}
        >
          {isUser ? message.content : formatContent(message.content)}
        </div>

        {/* Source badge for assistant */}
        {!isUser && message.source && (
          <span
            className={`text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide ${
              message.source === 'ai'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {message.source === 'ai' ? 'AI Powered' : 'Offline Analytics'}
          </span>
        )}
      </div>
    </div>
  );
}
