import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('unread-count')
  getUnreadCount(
    @CurrentUser() currentUser: { userId: number; roles: string[] },
  ) {
    return this.chatService.getUnreadCount(
      currentUser.userId,
      currentUser.roles,
    );
  }
}
