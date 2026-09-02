import { useState, useCallback } from 'react';
import { sendChatMessage } from '../api/client';
import type { ChatMessage } from '../types';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setError(null);

      const userMsg: ChatMessage = { role: 'user', content: text };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        const history = [...messages, userMsg]
          .slice(-5)
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await sendChatMessage(text, history);

        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: response.answer,
          source: response.source,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setError('Failed to get response. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [messages],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
