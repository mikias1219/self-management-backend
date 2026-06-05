import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUserPayload,
  CurrentUser,
} from '../../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { ChatMessageDto } from '../../application/dto/chat-message.dto';
import { ConfirmActionDto } from '../../application/dto/confirm-action.dto';
import { CreateAiCoachSessionDto } from '../../application/dto/create-ai-coach-session.dto';
import { UpdateAiCoachSessionDto } from '../../application/dto/update-ai-coach-session.dto';
import { AiChatService } from '../../application/services/ai-chat.service';
import { AiCoachService } from '../../application/services/ai-coach.service';

@ApiTags('ai-coach')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-coach')
export class AiCoachController {
  constructor(
    private readonly service: AiCoachService,
    private readonly aiChat: AiChatService,
  ) {}

  @Post('chat')
  chat(@CurrentUser() user: AuthUserPayload, @Body() dto: ChatMessageDto) {
    return this.aiChat.chat(user.sub, dto.message, dto.sessionId);
  }

  @Post('action')
  confirmAction(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: ConfirmActionDto,
  ) {
    return this.aiChat.confirmAction(user.sub, dto.sessionId, {
      id: dto.id ?? dto.tool,
      tool: dto.tool,
      label: dto.label ?? dto.tool,
      args: dto.args ?? {},
    });
  }

  @Get()
  findAll(@CurrentUser() user: AuthUserPayload) {
    return this.service.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.findOneForUser(user.sub, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUserPayload, @Body() dto: CreateAiCoachSessionDto) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateAiCoachSessionDto,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.service.remove(id, user.sub);
  }
}
