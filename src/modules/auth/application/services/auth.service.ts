import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Not, Repository } from 'typeorm';
import { User } from '../../../users/domain/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ActivityLogsService } from '../../../activity-logs/application/services/activity-logs.service';
import { SettingsService } from '../../../settings/application/services/settings.service';
import {
  ActivityAction,
  ActivityModule,
} from '../../../../common/domain/enums/activity-action.enum';

export type SafeUser = Omit<User, 'passwordHash'>;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly activityLogs: ActivityLogsService,
    private readonly settingsService: SettingsService,
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
    await this.settingsService.getForUser(saved.id);
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

  async validateUser(userId: string): Promise<SafeUser | null> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    return user ? this.toSafeUser(user) : null;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<SafeUser> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email && dto.email !== user.email) {
      const taken = await this.usersRepo.findOne({
        where: { email: dto.email, id: Not(userId) },
      });
      if (taken) {
        throw new ConflictException('Email already in use');
      }
      user.email = dto.email;
    }

    if (dto.displayName !== undefined) user.displayName = dto.displayName;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.timezone !== undefined) user.timezone = dto.timezone;
    if (dto.primaryCurrency !== undefined) {
      user.primaryCurrency = dto.primaryCurrency.toUpperCase();
    }
    if (dto.about !== undefined) user.about = dto.about || null;
    if (dto.focusAreas !== undefined) {
      user.focusAreas = dto.focusAreas.length ? dto.focusAreas : null;
    }

    const saved = await this.usersRepo.save(user);
    await this.activityLogs.log({
      userId: saved.id,
      module: ActivityModule.AUTH,
      action: ActivityAction.UPDATED,
      entityType: 'user',
      entityId: saved.id,
      description: 'Profile updated',
    });
    return this.toSafeUser(saved);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ success: true }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must differ from the current one',
      );
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepo.save(user);
    await this.activityLogs.log({
      userId: user.id,
      module: ActivityModule.AUTH,
      action: ActivityAction.UPDATED,
      entityType: 'user',
      entityId: user.id,
      description: 'Password changed',
    });
    return { success: true };
  }

  async resetPassword(
    userId: string,
    dto: ResetPasswordDto,
  ): Promise<{ success: true }> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersRepo.save(user);
    await this.activityLogs.log({
      userId: user.id,
      module: ActivityModule.AUTH,
      action: ActivityAction.UPDATED,
      entityType: 'user',
      entityId: user.id,
      description: 'Password reset (forgot current)',
    });
    return { success: true };
  }

  private toSafeUser(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      user: this.toSafeUser(user),
    };
  }
}
