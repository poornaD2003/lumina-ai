/**
 * Agent chat endpoint - accepts user questions and returns AI-powered or
 * fallback analytics responses. History is persisted to the database.
 */
import { Router } from 'express';
import { z } from 'zod';
import { businessAgent } from '../services/agent.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      }),
    )
    .default([]),
});

router.post('/chat', async (req, res, next) => {
  try {
    const { message, history } = chatSchema.parse(req.body);
    const response = await businessAgent.ask(message, history);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/agent/history - Retrieve persisted chat history.
 */
router.get('/history', async (_req, res, next) => {
  try {
    const history = await businessAgent.getHistory();
    res.json(history);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/agent/history - Clear all persisted chat history.
 */
router.delete('/history', async (_req, res, next) => {
  try {
    await businessAgent.clearHistory();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
