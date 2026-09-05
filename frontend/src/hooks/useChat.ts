import { useState, useCallback, useEffect } from 'react';
import { sendChatMessage, fetchChatHistory, clearChatHistory } from '../api/client';
import type { ChatMessage } from '../types';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load persisted history from the database when the chat opens
  useEffect(() => {
    let cancelled = false;

    fetchChatHistory()
      .then((history) => {
        if (!cancelled) setMessages(history);
      })
      .catch(() => {
        // History is a nice-to-have; don't block the chat on failure
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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

  const clearMessages = useCallback(async () => {
    setMessages([]);
    setError(null);
    try {
      await clearChatHistory();
    } catch {
      // Ignore clear failures; local state is already reset
    }
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
