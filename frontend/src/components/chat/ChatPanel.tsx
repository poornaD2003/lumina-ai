import { useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../../types';
import ChatMessageBubble from './ChatMessage';

interface Props {
  messages: ChatMessageType[];
  isLoading: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start">
      <div className="shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
        <Bot size={14} className="text-white" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-slate-100 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
          <span className="ml-2 text-xs text-slate-400">Analyzing...</span>
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel({ messages, isLoading }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        {messages.map((msg, i) => (
          <ChatMessageBubble key={i} message={msg} />
        ))}
        {isLoading && <TypingIndicator />}
      </div>
    </div>
  );
}
