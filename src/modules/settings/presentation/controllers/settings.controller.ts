import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { UpdateUserSettingsDto } from '../../application/dto/update-user-settings.dto';
import { SettingsService } from '../../application/services/settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  getCurrent(@CurrentUser() user: AuthUserPayload) {
    return this.service.getForUser(user.sub);
  }

  @Patch()
  updateCurrent(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    return this.service.updateForUser(user.sub, dto);
  }
}
