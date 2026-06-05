import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { format } from 'date-fns';
import { Repository } from 'typeorm';
import { LifeArea } from '../../../../common/domain/enums/life-area.enum';
import { FinanceAccount } from '../../../finance/domain/entities/account.entity';
import { TransactionType } from '../../../finance/domain/enums/finance.enums';
import { TransactionsService } from '../../../finance/application/services/transactions.service';
import { GoalLevel } from '../../../goals/domain/enums/goal.enums';
import { GoalsService } from '../../../goals/application/services/goals.service';
import { HabitsService } from '../../../habits/application/services/habits.service';
import { JournalEntryType } from '../../../journal/domain/enums/journal.enums';
import { JournalService } from '../../../journal/application/services/journal.service';
import { TasksService } from '../../../tasks/application/services/tasks.service';
import { TaskPriority, TaskStatus } from '../../../tasks/domain/enums/task.enums';

export interface ProposedAction {
  id: string;
  tool: string;
  label: string;
  args: Record<string, unknown>;
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

type ToolDef = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const LIFE_AREAS = Object.values(LifeArea);
const GOAL_LEVELS = Object.values(GoalLevel);
const JOURNAL_TYPES = Object.values(JournalEntryType);

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

@Injectable()
export class AiActionsService {
  constructor(
    private readonly tasks: TasksService,
    private readonly habits: HabitsService,
    private readonly goals: GoalsService,
    private readonly journal: JournalService,
    private readonly transactions: TransactionsService,
    @InjectRepository(FinanceAccount)
    private readonly accountsRepo: Repository<FinanceAccount>,
  ) {}

  /** OpenAI tool/function definitions the assistant may propose. */
  getToolDefinitions(): ToolDef[] {
    return [
      {
        type: 'function',
        function: {
          name: 'create_task',
          description:
            'Create a new task/plan for the user. Use when they want to add, plan, or schedule something to do.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Short task title' },
              estimatedMinutes: {
                type: 'number',
                description: 'Planned minutes, if mentioned',
              },
              priority: { type: 'string', enum: PRIORITIES },
              lifeArea: { type: 'string', enum: LIFE_AREAS },
              dueDate: {
                type: 'string',
                description: 'Due date as YYYY-MM-DD, if mentioned',
              },
            },
            required: ['title'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'complete_task',
          description:
            'Mark an existing open task as done. Match by the task title the user refers to.',
          parameters: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Title (or part of it) of the task to complete',
              },
            },
            required: ['title'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'log_habit',
          description:
            'Log/check-in an existing habit as completed for today. Match by habit name.',
          parameters: {
            type: 'object',
            properties: {
              habitName: {
                type: 'string',
                description: 'Name (or part) of the habit to log',
              },
            },
            required: ['habitName'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_goal',
          description: 'Create a new goal for the user.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              level: { type: 'string', enum: GOAL_LEVELS },
              category: { type: 'string' },
              targetDate: {
                type: 'string',
                description: 'Target date as YYYY-MM-DD, if mentioned',
              },
            },
            required: ['title'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'add_journal_entry',
          description: 'Add a journal entry for the user.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
              entryType: { type: 'string', enum: JOURNAL_TYPES },
            },
            required: ['title', 'content'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'add_transaction',
          description:
            'Record an income or expense transaction for today. Requires an existing account.',
          parameters: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['income', 'expense'] },
              amount: { type: 'number' },
              description: { type: 'string' },
              accountName: {
                type: 'string',
                description: 'Account name, if the user names one',
              },
            },
            required: ['type', 'amount'],
          },
        },
      },
    ];
  }

  /** Human-readable confirmation label for a proposed tool call. */
  describe(tool: string, args: Record<string, unknown>): string {
    switch (tool) {
      case 'create_task':
        return `Create task "${str(args.title)}"${
          args.estimatedMinutes ? ` (${String(args.estimatedMinutes)} min)` : ''
        }`;
      case 'complete_task':
        return `Mark "${str(args.title)}" as done`;
      case 'log_habit':
        return `Log habit "${str(args.habitName)}" for today`;
      case 'create_goal':
        return `Create ${str(args.level) || 'a'} goal "${str(args.title)}"`;
      case 'add_journal_entry':
        return `Add journal entry "${str(args.title)}"`;
      case 'add_transaction':
        return `Record ${str(args.type)} of ${String(args.amount)}${
          args.description ? ` (${str(args.description)})` : ''
        }`;
      default:
        return `Run ${tool}`;
    }
  }

  async execute(
    userId: string,
    tool: string,
    args: Record<string, unknown>,
  ): Promise<ActionResult> {
    try {
      switch (tool) {
        case 'create_task':
          return await this.createTask(userId, args);
        case 'complete_task':
          return await this.completeTask(userId, args);
        case 'log_habit':
          return await this.logHabit(userId, args);
        case 'create_goal':
          return await this.createGoal(userId, args);
        case 'add_journal_entry':
          return await this.addJournalEntry(userId, args);
        case 'add_transaction':
          return await this.addTransaction(userId, args);
        default:
          return { ok: false, message: `Unknown action: ${tool}` };
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Action failed unexpectedly';
      return { ok: false, message };
    }
  }

  private async createTask(
    userId: string,
    args: Record<string, unknown>,
  ): Promise<ActionResult> {
    const title = str(args.title);
    if (!title) return { ok: false, message: 'Task needs a title' };
    const task = await this.tasks.create(
      {
        title,
        estimatedMinutes:
          typeof args.estimatedMinutes === 'number'
            ? args.estimatedMinutes
            : undefined,
        priority: PRIORITIES.includes(str(args.priority))
          ? (str(args.priority) as TaskPriority)
          : undefined,
        lifeArea: LIFE_AREAS.includes(str(args.lifeArea) as LifeArea)
          ? (str(args.lifeArea) as LifeArea)
          : undefined,
        dueDate: str(args.dueDate) || undefined,
      },
      userId,
    );
    return { ok: true, message: `Created task "${task.title}".` };
  }

  private async completeTask(
    userId: string,
    args: Record<string, unknown>,
  ): Promise<ActionResult> {
    const query = str(args.title).toLowerCase();
    if (!query) return { ok: false, message: 'Tell me which task to complete' };
    const all = await this.tasks.findAllForUser(userId);
    const open = all.filter(
      (t) =>
        t.taskStatus !== TaskStatus.DONE &&
        t.taskStatus !== TaskStatus.CANCELLED,
    );
    const match =
      open.find((t) => t.title.toLowerCase() === query) ??
      open.find((t) => t.title.toLowerCase().includes(query));
    if (!match) {
      return { ok: false, message: `No open task matching "${str(args.title)}".` };
    }
    await this.tasks.update(match.id, { taskStatus: TaskStatus.DONE }, userId);
    return { ok: true, message: `Marked "${match.title}" as done.` };
  }

  private async logHabit(
    userId: string,
    args: Record<string, unknown>,
  ): Promise<ActionResult> {
    const query = str(args.habitName).toLowerCase();
    if (!query) return { ok: false, message: 'Tell me which habit to log' };
    const habits = await this.habits.findAllForUser(userId);
    const match =
      habits.find((h) => h.name.toLowerCase() === query) ??
      habits.find((h) => h.name.toLowerCase().includes(query));
    if (!match) {
      return { ok: false, message: `No habit matching "${str(args.habitName)}".` };
    }
    await this.habits.createLog(userId, match.id, {
      completedAt: new Date().toISOString(),
    });
    return { ok: true, message: `Logged "${match.name}" for today.` };
  }

  private async createGoal(
    userId: string,
    args: Record<string, unknown>,
  ): Promise<ActionResult> {
    const title = str(args.title);
    if (!title) return { ok: false, message: 'Goal needs a title' };
    const level = GOAL_LEVELS.includes(str(args.level) as GoalLevel)
      ? (str(args.level) as GoalLevel)
      : GoalLevel.MONTHLY;
    const goal = await this.goals.create(
      {
        title,
        level,
        category: str(args.category) || undefined,
        targetDate: str(args.targetDate) || undefined,
      },
      userId,
    );
    return { ok: true, message: `Created ${level} goal "${goal.title}".` };
  }

  private async addJournalEntry(
    userId: string,
    args: Record<string, unknown>,
  ): Promise<ActionResult> {
    const title = str(args.title);
    const content = str(args.content);
    if (!title || !content) {
      return { ok: false, message: 'Journal entry needs a title and content' };
    }
    const entryType = JOURNAL_TYPES.includes(str(args.entryType) as JournalEntryType)
      ? (str(args.entryType) as JournalEntryType)
      : JournalEntryType.DAILY_THOUGHT;
    await this.journal.create(
      {
        title,
        content,
        entryType,
        entryDate: format(new Date(), 'yyyy-MM-dd'),
      },
      userId,
    );
    return { ok: true, message: `Added journal entry "${title}".` };
  }

  private async addTransaction(
    userId: string,
    args: Record<string, unknown>,
  ): Promise<ActionResult> {
    const type = str(args.type);
    const amount = typeof args.amount === 'number' ? args.amount : NaN;
    if (type !== 'income' && type !== 'expense') {
      return { ok: false, message: 'Transaction type must be income or expense' };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, message: 'Transaction needs a positive amount' };
    }
    const accounts = await this.accountsRepo.find({
      where: { createdBy: userId },
      order: { createdAt: 'ASC' },
    });
    if (accounts.length === 0) {
      return {
        ok: false,
        message: 'No finance account yet — add one in Life → Finance first.',
      };
    }
    const named = str(args.accountName).toLowerCase();
    const account =
      (named &&
        accounts.find((a) => a.name.toLowerCase().includes(named))) ||
      accounts[0];
    await this.transactions.create(
      {
        accountId: account.id,
        transactionType:
          type === 'income' ? TransactionType.INCOME : TransactionType.EXPENSE,
        amount,
        currency: account.currency,
        transactionDate: format(new Date(), 'yyyy-MM-dd'),
        description: str(args.description) || undefined,
      },
      userId,
    );
    return {
      ok: true,
      message: `Recorded ${type} of ${amount} ${account.currency} on ${account.name}.`,
    };
  }
}
