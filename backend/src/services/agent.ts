/**
 * Business intelligence AI agent - combines Gemini AI chat completions with
 * live business data context. Falls back to keyword-based analytics responses
 * when no API key is configured or the AI call fails.
 * Chat history is persisted to the database.
 */
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { SYSTEM_PROMPT } from './prompts.js';
import { buildContext } from './context-builder.js';
import * as analytics from './analytics.js';
import { getSalesForecast } from './forecast.js';
import { prisma } from '../lib/prisma.js';
import type { ChatResponse } from '../types/index.js';

const fmtCurrency = (n: number): string =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

class BusinessAgent {
  private getOpenAI(): OpenAI | null {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    // Gemini API keys start with 'AIzaSy'; reject obviously malformed keys early
    // to avoid wasting retries on 400 'Invalid Auth key' errors.
    if (!apiKey.startsWith('AQ')) {
      console.warn(
        'GEMINI_API_KEY does not look like a valid Gemini key (should start with AIza...). ' +
        'Get one at https://aistudio.google.com/apikey',
      );
      return null;
    }

    return new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
      timeout: 30000, // 30 second timeout
    });
  }

  /**
   * Fetch the most recent N messages from the database to seed the UI.
   * Ordered oldest -> newest so they render as a natural conversation.
   */
  async getHistory(limit = 20): Promise<Array<{ role: 'user' | 'assistant'; content: string; source?: string | null }>> {
    // Query newest first so `take` grabs the latest N, then restore
    // chronological order for display.
    const rows = await prisma.chatMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    rows.reverse();
    return rows.map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content, source: r.source }));
  }

  /**
   * Clear all persisted chat messages.
   */
  async clearHistory(): Promise<void> {
    await prisma.chatMessage.deleteMany();
  }

  async ask(
    question: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }>,
  ): Promise<ChatResponse> {
    const context = await buildContext(question);
    const client = this.getOpenAI();

    // Persist the user's message first so the conversation is stored even
    // if the AI call later fails (the fallback response is also stored).
    await prisma.chatMessage
      .create({ data: { role: 'user', content: question } })
      .catch((e) => console.error('Failed to save user message:', e));

    if (!client) {
      const answer = await this.fallbackResponse(question, context);
      await this.saveAssistantMessage(answer, 'fallback');
      return { answer, source: 'fallback' };
    }

    try {
      const answer = await this.callGemini(client, question, history, context);
      await this.saveAssistantMessage(answer, 'ai');
      return { answer, source: 'ai' };
    } catch (error) {
      console.error('Gemini error, using fallback:', error);
      const answer = await this.fallbackResponse(question, context);
      await this.saveAssistantMessage(answer, 'fallback');
      return { answer, source: 'fallback' };
    }
  }

  private async saveAssistantMessage(content: string, source: string): Promise<void> {
    await prisma.chatMessage
      .create({ data: { role: 'assistant', content, source } })
      .catch((e) => console.error('Failed to save assistant message:', e));
  }

  private async callGemini(
    client: OpenAI,
    question: string,
    history: Array<{ role: string; content: string }>,
    context: string,
  ): Promise<string> {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'system', content: `Current business data context:\n\n${context}` },
    ];

    // Include last 5 history messages
    const recentHistory = history.slice(-5);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
    }

    messages.push({ role: 'user', content: question });

    let lastError: unknown;
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const completion = await client.chat.completions.create({
          model: 'gemini-3.6-flash',
          messages,
          temperature: 0.3,
          max_tokens: 1024,
        });
        return completion.choices[0]?.message?.content ?? 'No response generated.';
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
        }
      }
    }
    throw lastError;
  }

  private async fallbackResponse(question: string, _context: string): Promise<string> {
    const lower = question.toLowerCase();
    const prefix = '\ud83d\udcca Offline Analytics Mode\n\n';

    // Forecast
    if (lower.includes('forecast') || lower.includes('predict') || lower.includes('projection')) {
      const forecast = await getSalesForecast(3);
      if (forecast.length === 0) return prefix + 'No forecast data available.';
      const future = forecast.filter((f) => !f.actual);
      const recent = forecast.filter((f) => f.actual).slice(-3);
      let text = '**Sales Forecast**\n\n';
      if (recent.length > 0) {
        text += 'Recent performance:\n';
        recent.forEach((f) => {
          text += `  \u2022 ${f.period}: Actual ${fmtCurrency(f.actual!)} vs Predicted ${fmtCurrency(f.predicted)}\n`;
        });
        text += '\n';
      }
      if (future.length > 0) {
        text += 'Projected:\n';
        future.forEach((f) => {
          text += `  \u2022 ${f.period}: ${fmtCurrency(f.predicted)}\n`;
        });
      }
      text += '\n\u26a0\ufe0f Note: These are statistical projections based on linear regression, not guarantees.';
      return prefix + text;
    }

    // Top products / best sellers
    if (lower.includes('top product') || lower.includes('best seller') || lower.includes('top selling')) {
      const products = await analytics.getProductPerformance(5);
      if (products.length === 0) return prefix + 'No product data available.';
      let text = '**Top Products by Revenue**\n\n';
      products.forEach((p, i) => {
        text += `  ${i + 1}. **${p.productName}** \u2014 ${fmtCurrency(p.totalRevenue)} (${p.totalSold} units sold, ${p.margin}% margin)\n`;
      });
      return prefix + text;
    }

    // Inventory / stock
    if (lower.includes('inventory') || lower.includes('stock') || lower.includes('reorder')) {
      const alerts = await analytics.getInventoryAlerts();
      if (alerts.length === 0) return prefix + 'No inventory alerts. All products are above reorder levels.';
      let text = `**Inventory Alerts** (${alerts.length} products need attention)\n\n`;
      alerts.forEach((a) => {
        text += `  \u2022 **${a.productName}** (SKU: ${a.sku}) \u2014 Stock: ${a.stockQuantity} units (reorder level: ${a.reorderLevel})\n`;
      });
      return prefix + text;
    }

    // Customer segments
    if (lower.includes('customer') || lower.includes('segment') || lower.includes('client')) {
      const segments = await analytics.getCustomerSegments();
      if (segments.length === 0) return prefix + 'No customer segment data available.';
      let text = '**Customer Segments**\n\n';
      segments.forEach((s) => {
        text += `  \u2022 **${s.segment}**: ${s.count} customers\n`;
        text += `    Avg LTV: ${fmtCurrency(s.avgLTV)} | Total Revenue: ${fmtCurrency(s.totalRevenue)}\n`;
      });
      return prefix + text;
    }

    // Financial / P&L
    if (lower.includes('expense') || lower.includes('financial') || lower.includes('profit') || lower.includes('p&l') || lower.includes('pnl')) {
      const financials = await analytics.getFinancialOverview(6);
      if (financials.length === 0) return prefix + 'No financial data available.';
      let text = '**Financial Overview (last 6 months)**\n\n';
      financials.forEach((f) => {
        text += `  \u2022 ${f.period}: Revenue ${fmtCurrency(f.revenue)} | Expenses ${fmtCurrency(f.expenses)} | Net Profit ${fmtCurrency(f.netProfit)}\n`;
      });
      const latest = financials[financials.length - 1];
      if (latest) {
        const marginPct = latest.revenue > 0 ? ((latest.netProfit / latest.revenue) * 100).toFixed(1) : '0';
        text += `\nLatest period margin: ${marginPct}%`;
      }
      return prefix + text;
    }

    // Region
    if (lower.includes('region') || lower.includes('north') || lower.includes('south') || lower.includes('east') || lower.includes('west')) {
      const regions = await analytics.getSalesByRegion();
      if (regions.length === 0) return prefix + 'No regional data available.';
      let text = '**Sales by Region**\n\n';
      regions.forEach((r) => {
        text += `  \u2022 **${r.region}**: ${fmtCurrency(r.totalRevenue)} (${r.orderCount} orders)\n`;
      });
      return prefix + text;
    }

    // Sales
    if (lower.includes('sales') || lower.includes('revenue') || lower.includes('orders')) {
      const [kpis, sales] = await Promise.all([
        analytics.getKPIs(),
        analytics.getSalesSummary(6),
      ]);
      let text = '**Sales Summary**\n\n';
      text += `  \u2022 Total Revenue: ${fmtCurrency(kpis.totalRevenue)}\n`;
      text += `  \u2022 Total Orders: ${kpis.totalOrders.toLocaleString()}\n`;
      text += `  \u2022 Avg Order Value: ${fmtCurrency(kpis.avgOrderValue)}\n\n`;
      if (sales.length > 0) {
        text += 'Monthly breakdown:\n';
        sales.forEach((s) => {
          text += `  \u2022 ${s.period}: ${fmtCurrency(s.totalRevenue)} (${s.orderCount} orders)\n`;
        });
      }
      return prefix + text;
    }

    // Default: KPI summary
    const kpis = await analytics.getKPIs();
    let text = '**Business Overview**\n\n';
    text += `  \u2022 Total Revenue: ${fmtCurrency(kpis.totalRevenue)}\n`;
    text += `  \u2022 Active Customers: ${kpis.activeCustomers}\n`;
    text += `  \u2022 Total Orders: ${kpis.totalOrders.toLocaleString()}\n`;
    text += `  \u2022 Avg Order Value: ${fmtCurrency(kpis.avgOrderValue)}\n`;
    text += `  \u2022 Top Product: ${kpis.topProduct}\n`;
    text += `  \u2022 Top Region: ${kpis.topRegion}\n`;
    return prefix + text;
  }
}

export const businessAgent = new BusinessAgent();
