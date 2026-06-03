import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiCoachSession } from '../../domain/entities/ai-coach-session.entity';
import { AiChatContextService } from './ai-chat-context.service';

type CoachMessage = { role: string; content: string; createdAt: string };

const SYSTEM_PROMPT = `You are LifeOS Assistant — a personal coach with read-only access to the user's LifeOS app data.

You receive a JSON snapshot keyed by module (tasks, goals, habits, finance, learning, english, spiritual, health, journal, notifications, activityLogs, analytics, achievements). Each module mirrors a real API route (e.g. tasks.api = "/tasks"). Use achievements.today / achievements.thisWeek for ongoing vs finished vs achieved counts.

DATA RULES:
- Answer ONLY from the snapshot. Never invent items, amounts, or dates.
- If a section is empty, state clearly: "No [module] data for today" and suggest logging it in LifeOS.
- Use meta.today for "today" and meta.primaryCurrency for money.
- You cannot create, edit, or delete records — only explain existing data.

RESPONSE FORMAT (always follow for readability):
1. Start with a bold one-line summary: **Summary:** …
2. Use markdown ## headings per topic (e.g. ## Tasks, ## Finance Today).
3. Use bullet lists (- item) for multiple entries; put the most important fact first in each bullet.
4. Bold key numbers: **$120.50**, **3 tasks**, **45 min**
5. For totals, show a small table or labeled lines:
   - Expenses: **$X**
   - Income: **$Y**
   - Net: **$Z**
6. End with **Tip:** or **Next step:** when helpful (one short line).
7. Keep tone warm and professional. Prefer short paragraphs over walls of text.`;

@Injectable()
export class AiChatService {
  constructor(
    private readonly config: ConfigService,
    private readonly contextService: AiChatContextService,
    @InjectRepository(AiCoachSession)
    private readonly sessionsRepo: Repository<AiCoachSession>,
  ) {}

  async chat(userId: string, message: string, sessionId?: string) {
    const apiKey = this.config.get<string>('openApiKey');
    if (!apiKey?.trim()) {
      throw new ServiceUnavailableException(
        'AI is not configured. Set OPEN_API_KEY in the backend environment.',
      );
    }

    const trimmed = message.trim();
    if (!trimmed) {
      throw new BadRequestException('Message cannot be empty');
    }

    let session: AiCoachSession | null = null;
    if (sessionId) {
      session = await this.sessionsRepo.findOne({
        where: { id: sessionId, createdBy: userId },
      });
      if (!session) {
        throw new BadRequestException('Chat session not found');
      }
    }

    const userContext = await this.contextService.buildForUser(userId);
    const contextBlock = JSON.stringify(userContext, null, 0);

    const history: CoachMessage[] = session?.messages ?? [];
    const recentHistory = history.slice(-16);

    const openAiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'system',
        content: `Current user data snapshot:\n${contextBlock}`,
      },
      ...recentHistory.map((m) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: trimmed },
    ];

    const model = this.config.get<string>('openAiModel') ?? 'gpt-4o-mini';
    const reply = await this.callOpenAi(apiKey, model, openAiMessages);

    const now = new Date().toISOString();
    const userMsg: CoachMessage = { role: 'user', content: trimmed, createdAt: now };
    const assistantMsg: CoachMessage = {
      role: 'assistant',
      content: reply,
      createdAt: new Date().toISOString(),
    };
    const updatedMessages = [...history, userMsg, assistantMsg];

    if (!session) {
      session = this.sessionsRepo.create({
        title: trimmed.length > 48 ? `${trimmed.slice(0, 48)}…` : trimmed,
        messages: updatedMessages,
        isArchived: false,
        createdBy: userId,
      });
    } else {
      session.messages = updatedMessages;
    }

    const saved = await this.sessionsRepo.save(session);

    return {
      sessionId: saved.id,
      reply,
      messages: saved.messages,
    };
  }

  private async callOpenAi(
    apiKey: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 1536,
      }),
    });

    if (!res.ok) {
      await res.text();
      throw new ServiceUnavailableException(
        `AI request failed (${res.status}). Check OPEN_API_KEY and billing.`,
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new ServiceUnavailableException('AI returned an empty response');
    }
    return content;
  }
}
