import { Trash2, TrendingUp, Users, Package, BarChart3 } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import ChatPanel from '../components/chat/ChatPanel';
import ChatInput from '../components/chat/ChatInput';

const suggestions = [
  { text: 'What are my top selling products?', icon: Package, color: 'text-violet-500 bg-violet-50 border-violet-100' },
  { text: 'Show me seasonal trends for high-margin products.', icon: TrendingUp, color: 'text-blue-500 bg-blue-50 border-blue-100' },
  { text: 'Which customers are most valuable?', icon: Users, color: 'text-emerald-500 bg-emerald-50 border-emerald-100' },
  { text: 'What products should I restock for next month to maximize profit?', icon: BarChart3, color: 'text-amber-500 bg-amber-50 border-amber-100' },
];

function EmptyState({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-16 h-16 rounded-2xl overflow-hidden mb-5 shadow-lg shadow-slate-200">
        <img src="/favicon.svg" alt="Lumina" className="w-full h-full" />
      </div>
      <h2 className="text-xl font-semibold text-slate-800 mb-1.5">
        Ask me anything about your business
      </h2>
      <p className="text-sm text-slate-400 mb-8 max-w-sm">
        I can analyze sales, customers, products, and financial data
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {suggestions.map(({ text, icon: Icon, color }) => (
          <button
            key={text}
            onClick={() => onSuggestionClick(text)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium text-slate-700 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 ${color}`}
          >
            <Icon size={16} className="shrink-0" />
            <span className="text-left leading-snug">{text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src="/favicon.svg" alt="Lumina" className="w-full h-full" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-slate-800">Lumina AI Chat</h1>
            <p className="text-[11px] text-slate-400">Powered by Gemini</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            title="Clear conversation"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="shrink-0 mx-4 mt-3 px-4 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Messages, history loading state, or empty state */}
      {isLoading && messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Loading conversation...
        </div>
      ) : messages.length === 0 ? (
        <EmptyState onSuggestionClick={sendMessage} />
      ) : (
        <ChatPanel messages={messages} isLoading={isLoading} />
      )}

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
