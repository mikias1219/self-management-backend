import { NotFoundException } from '@nestjs/common';
import {
  DeepPartial,
  FindManyOptions,
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { BaseEntity } from '../domain/base.entity';
import { EntityStatus } from '../domain/enums/entity-status.enum';
import {
  ActivityAction,
  ActivityModule,
} from '../domain/enums/activity-action.enum';
import { ActivityLogsService } from '../../modules/activity-logs/application/services/activity-logs.service';

export interface CrudContext {
  userId: string;
  module: ActivityModule;
  entityType: string;
}

export abstract class BaseCrudService<T extends BaseEntity> {
  /** TypeORM relations (object syntax required in TypeORM v1+). */
  protected readonly relations: FindOptionsRelations<T> = {} as FindOptionsRelations<T>;

  constructor(
    protected readonly repository: Repository<T>,
    protected readonly activityLogs: ActivityLogsService,
    protected readonly context: CrudContext,
  ) {}

  protected withRelations(
    options?: FindManyOptions<T>,
  ): FindManyOptions<T> {
    const hasDefault =
      this.relations &&
      typeof this.relations === 'object' &&
      Object.keys(this.relations).length > 0;
    const relations = options?.relations ?? (hasDefault ? this.relations : undefined);
    if (!relations) return { ...options };
    return { ...options, relations };
  }

  async findAll(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find({
      ...this.withRelations(options),
      order: {
        createdAt: 'DESC',
        ...(options?.order ?? {}),
      } as FindOptionsOrder<T>,
    });
  }

  async findAllForUser(
    userId: string,
    options?: FindManyOptions<T>,
  ): Promise<T[]> {
    return this.repository.find({
      ...this.withRelations(options),
      where: { createdBy: userId, ...(options?.where ?? {}) } as FindOptionsWhere<T>,
      order: {
        createdAt: 'DESC',
        ...(options?.order ?? {}),
      } as FindOptionsOrder<T>,
    });
  }

  async findOne(id: string): Promise<T> {
    const entity = await this.repository.findOne({
      ...this.withRelations(),
      where: { id } as FindOptionsWhere<T>,
    });
    if (!entity) {
      throw new NotFoundException(`${this.context.entityType} not found`);
    }
    return entity;
  }

  async findOneForUser(userId: string, id: string): Promise<T> {
    const entity = await this.repository.findOne({
      ...this.withRelations(),
      where: { id, createdBy: userId } as FindOptionsWhere<T>,
    });
    if (!entity) {
      throw new NotFoundException(`${this.context.entityType} not found`);
    }
    return entity;
  }

  async create(dto: DeepPartial<T>, userId: string): Promise<T> {
    const entity = this.repository.create({
      ...dto,
      createdBy: userId,
      status: EntityStatus.ACTIVE,
    } as DeepPartial<T>);
    const saved = await this.repository.save(entity);
    await this.activityLogs.log({
      userId,
      module: this.context.module,
      action: ActivityAction.CREATED,
      entityType: this.context.entityType,
      entityId: saved.id,
      metadata: dto as Record<string, unknown>,
    });
    return saved;
  }

  async update(id: string, dto: DeepPartial<T>, userId: string): Promise<T> {
    const entity = await this.findOneForUser(userId, id);
    Object.assign(entity, dto);
    const saved = await this.repository.save(entity);
    await this.activityLogs.log({
      userId,
      module: this.context.module,
      action: ActivityAction.UPDATED,
      entityType: this.context.entityType,
      entityId: saved.id,
      metadata: dto as Record<string, unknown>,
    });
    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    const entity = await this.findOneForUser(userId, id);
    await this.repository.softRemove(entity);
    await this.activityLogs.log({
      userId,
      module: this.context.module,
      action: ActivityAction.DELETED,
      entityType: this.context.entityType,
      entityId: id,
    });
  }
}
