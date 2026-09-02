/**
 * Agent chat endpoint — accepts user questions and returns AI-powered or
 * fallback analytics responses.
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

export default router;
