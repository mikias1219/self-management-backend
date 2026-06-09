import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiCoachSession } from '../../domain/entities/ai-coach-session.entity';
import { AiChatContextService } from './ai-chat-context.service';
import {
  AiActionsService,
  ProposedAction,
} from './ai-actions.service';

type CoachMessage = { role: string; content: string; createdAt: string };

const MAX_STORED_MESSAGES = 100;

interface OpenAiToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

const SYSTEM_PROMPT = `You are LifeOS — a Personal Operating System analyst with read-only access to unified life data.

You receive AI_CONTEXT: profile, intelligence (dailySummary, scores, finance analytics, task metrics), tasks, finance, goals, habits, learning, and other modules. intelligence.aiInsight is the system's own read — align with it when relevant.

CORE QUESTIONS you must answer when asked:
- What did I do? → activityLogs, completed tasks, habits, transactions today
- What is my financial status? → intelligence.monthlyTrend, finance.monthly, burnRate, forecast, spendingByCategory
- What should I do next? → schedule.todayAndUpcoming, schedule.summary, tasks.focusToday, tasks.overdue, intelligence.aiInsight
- What is on my schedule / calendar? → schedule.todayAndUpcoming (tasks, goals, habits, reviews, Google events merged)

SCHEDULE INTELLIGENCE (unified productivity):
- schedule.summary: open tasks, due today, habits logged vs due, review done
- schedule.todayAndUpcoming: merged timeline — cite kind (task/goal/habit/review/calendar), title, start time, status
- tasks.syncedToCalendar: whether LifeOS pushed the item to Google Calendar

FINANCE INTELLIGENCE (use real numbers only):
- Monthly income/expense/net, savings rate %, burn rate, end-of-month forecast
- Top overspend category from spendingByCategory

TASK INTELLIGENCE:
- focusToday, overdue, productivityScore, completionRate, weeklyCompletionTrend

ACTIONS (you can now DO things, not just read):
- Use a tool when the user asks to add, create, plan, log, record, complete, or finish something.
  Tools: create_task, complete_task, log_habit, create_goal, add_journal_entry, add_transaction.
- Call the tool with your best-extracted arguments. Do NOT also write a long answer — a short confirming sentence is enough.
- The user reviews and confirms every action before it is saved, so propose confidently.
- For pure questions ("what / how much / summarize"), answer from the snapshot WITHOUT calling a tool.

DATA RULES:
- Answer ONLY from the snapshot. Never invent amounts or dates.
- Use profile.primaryCurrency (default ETB) for money.

FORMAT:
1. **Summary:** one bold line
2. ## headings per domain
3. Bullets with bold key numbers
4. **Next step:** one actionable line when helpful`;

@Injectable()
export class AiChatService {
  constructor(
    private readonly config: ConfigService,
    private readonly contextService: AiChatContextService,
    private readonly actions: AiActionsService,
    @InjectRepository(AiCoachSession)
    private readonly sessionsRepo: Repository<AiCoachSession>,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getModuleInsight(userId: string, moduleKey: string) {
    const cacheKey = `ai:module-insight:${userId}:${moduleKey}`;
    const cached = await this.cache.get<string>(cacheKey);
    if (cached) return { insight: cached };

    const ctx = await this.contextService.buildForUser(userId);
    let insight = 'Keep going — small consistent steps add up.';
    if (moduleKey === 'finance') {
      const expense = ctx.intelligence?.monthlyTrend?.expense ?? 0;
      insight =
        expense > 0
          ? `You've spent ${expense} this month. Check your top categories before adding more.`
          : 'Log your first expense to start tracking your budget.';
    } else if (moduleKey === 'goals') {
      const goalItems = ctx.goals?.items ?? [];
      const open = goalItems.filter((g) => (g.progressPercent ?? 0) < 100).length;
      insight =
        open > 0
          ? `You have ${open} active goals. Link tasks to make progress visible.`
          : 'Set a weekly target to give your tasks direction.';
    } else if (moduleKey === 'tasks') {
      const overdue = Array.isArray(ctx.tasks?.overdue)
        ? ctx.tasks.overdue.length
        : Number(ctx.tasks?.counts?.open ?? 0);
      insight =
        overdue > 0
          ? `${overdue} task(s) need attention. Tackle the smallest one first.`
          : 'Your task list looks clear — add one meaningful item for today.';
    } else if (moduleKey === 'learning') {
      insight = 'Schedule 30 minutes of focused study to stay on track.';
    }

    await this.cache.set(cacheKey, insight, 4 * 60 * 60 * 1000);
    return { insight };
  }

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
    const completion = await this.callOpenAi(apiKey, model, openAiMessages);

    const pendingActions = this.toProposedActions(completion.toolCalls);
    const reply =
      completion.content?.trim() ||
      (pendingActions.length
        ? this.proposalSummary(pendingActions)
        : '');

    if (!reply) {
      throw new ServiceUnavailableException('AI returned an empty response');
    }

    const now = new Date().toISOString();
    const userMsg: CoachMessage = { role: 'user', content: trimmed, createdAt: now };
    const assistantMsg: CoachMessage = {
      role: 'assistant',
      content: reply,
      createdAt: new Date().toISOString(),
    };
    const updatedMessages = [...history, userMsg, assistantMsg].slice(
      -MAX_STORED_MESSAGES,
    );

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
      pendingActions,
    };
  }

  /** Execute a previously proposed action after the user confirms it. */
  async confirmAction(
    userId: string,
    sessionId: string,
    action: ProposedAction,
  ) {
    const session = await this.sessionsRepo.findOne({
      where: { id: sessionId, createdBy: userId },
    });
    if (!session) {
      throw new BadRequestException('Chat session not found');
    }

    const result = await this.actions.execute(
      userId,
      action.tool,
      action.args ?? {},
    );

    const note: CoachMessage = {
      role: 'assistant',
      content: result.ok ? `Done — ${result.message}` : `Couldn't do that — ${result.message}`,
      createdAt: new Date().toISOString(),
    };
    session.messages = [...(session.messages ?? []), note].slice(
      -MAX_STORED_MESSAGES,
    );
    const saved = await this.sessionsRepo.save(session);

    return {
      sessionId: saved.id,
      ok: result.ok,
      message: result.message,
      messages: saved.messages,
    };
  }

  private toProposedActions(toolCalls: OpenAiToolCall[]): ProposedAction[] {
    const actions: ProposedAction[] = [];
    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = call.function.arguments
          ? (JSON.parse(call.function.arguments) as Record<string, unknown>)
          : {};
      } catch {
        args = {};
      }
      actions.push({
        id: call.id,
        tool: call.function.name,
        label: this.actions.describe(call.function.name, args),
        args,
      });
    }
    return actions;
  }

  private proposalSummary(actions: ProposedAction[]): string {
    if (actions.length === 1) {
      return `I can do this for you: ${actions[0].label}. Confirm to proceed.`;
    }
    const lines = actions.map((a) => `- ${a.label}`).join('\n');
    return `I can do the following — confirm to proceed:\n${lines}`;
  }

  private async callOpenAi(
    apiKey: string,
    model: string,
    messages: Array<{ role: string; content: string }>,
  ): Promise<{ content: string | null; toolCalls: OpenAiToolCall[] }> {
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
        tools: this.actions.getToolDefinitions(),
        tool_choice: 'auto',
      }),
    });

    if (!res.ok) {
      await res.text();
      throw new ServiceUnavailableException(
        `AI request failed (${res.status}). Check OPEN_API_KEY and billing.`,
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string | null; tool_calls?: OpenAiToolCall[] };
      }>;
    };
    const message = data.choices?.[0]?.message;
    return {
      content: message?.content ?? null,
      toolCalls: message?.tool_calls ?? [],
    };
  }
}
