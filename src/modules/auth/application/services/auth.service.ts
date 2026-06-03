import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../../../users/domain/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import {
  ActivityAction,
  ActivityModule,
} from '../../../../common/domain/enums/activity-action.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
      createdBy: null,
    });
    const saved = await this.usersRepo.save(user);
    await this.activityLogs.log({
      userId: saved.id,
      module: ActivityModule.AUTH,
      action: ActivityAction.CREATED,
      entityType: 'user',
      entityId: saved.id,
    });
    return this.buildAuthResponse(saved);
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.activityLogs.log({
      userId: user.id,
      module: ActivityModule.AUTH,
      action: ActivityAction.LOGGED,
      entityType: 'user',
      entityId: user.id,
      description: 'User logged in',
    });
    return this.buildAuthResponse(user);
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id: userId } });
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        timezone: user.timezone,
      },
    };
  }
}
