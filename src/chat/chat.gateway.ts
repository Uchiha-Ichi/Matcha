import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ChatService } from './chat.service';
import { WsJwtGuard } from './ws-jwt.guard';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
  },
  namespace: '/chat',      // FE kết nối: io('http://localhost:8000/chat')
})
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly chatService: ChatService) { }

  // ───────────────────────────────────────────────
  // Lifecycle
  // ───────────────────────────────────────────────

  handleConnection(client: Socket) {
    console.log(`[Chat] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[Chat] Client disconnected: ${client.id}`);
  }

  // ───────────────────────────────────────────────
  // Helper: lấy user từ socket sau khi guard chạy
  // ───────────────────────────────────────────────
  private getCurrentUser(client: Socket): { userId: number; roles: string[] } {
    const user = (client as any).user;
    if (!user) throw new WsException('Chưa xác thực');
    return user;
  }

  // ───────────────────────────────────────────────
  // Event: join_room — vào phòng chat của conversation
  // ───────────────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: number },
  ) {
    const room = `conversation_${data.conversation_id}`;
    await client.join(room);
    return { event: 'joined', room };
  }

  // ───────────────────────────────────────────────
  // Event: leave_room — rời phòng
  // ───────────────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: number },
  ) {
    const room = `conversation_${data.conversation_id}`;
    await client.leave(room);
    return { event: 'left', room };
  }

  // ───────────────────────────────────────────────
  // Event: create_conversation — tạo hoặc lấy lại conversation
  // ───────────────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('create_conversation')
  async handleCreateConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: CreateConversationDto,
  ) {
    const { userId } = this.getCurrentUser(client);
    const conversation = await this.chatService.getOrCreateConversation(userId, dto);
    // Tự join room ngay
    await client.join(`conversation_${conversation.id}`);
    return { event: 'conversation_ready', data: { conversation } };
  }

  // ───────────────────────────────────────────────
  // Event: get_conversations — lấy danh sách conversations
  // ───────────────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('get_conversations')
  async handleGetConversations(@ConnectedSocket() client: Socket) {
    const { userId, roles } = this.getCurrentUser(client);
    const conversations = await this.chatService.getConversations(userId, roles);
    return { event: 'conversations_list', data: { conversations } };
  }

  // ───────────────────────────────────────────────
  // Event: get_messages — lấy tin nhắn cũ (có phân trang)
  // ───────────────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('get_messages')
  async handleGetMessages(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: number; page?: number },
  ) {
    this.getCurrentUser(client); // xác thực
    const messages = await this.chatService.getMessages(
      data.conversation_id,
      data.page ?? 1,
    );
    return { event: 'messages_history', data: { messages } };
  }

  // ───────────────────────────────────────────────
  // Event: send_message — gửi tin nhắn, broadcast cho phòng
  // ───────────────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const { userId } = this.getCurrentUser(client);
    const message = await this.chatService.saveMessage(userId, dto);
    const room = `conversation_${dto.conversation_id}`;

    // Phát tới tất cả client trong phòng (kể cả người gửi)
    this.server.to(room).emit('new_message', message);

    return { event: 'message_sent', data: { message } };
  }

  // ───────────────────────────────────────────────
  // Event: mark_read — đánh dấu đã đọc
  // ───────────────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: number },
  ) {
    const { userId } = this.getCurrentUser(client);
    await this.chatService.markAsRead(data.conversation_id, userId);
    const room = `conversation_${data.conversation_id}`;
    // Thông báo cho phòng biết user này đã đọc
    this.server.to(room).emit('messages_read', { conversation_id: data.conversation_id, user_id: userId });
    return { event: 'marked_read', data: null };
  }

  // ───────────────────────────────────────────────
  // Event: typing — thông báo đang gõ
  // ───────────────────────────────────────────────
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversation_id: number; is_typing: boolean },
  ) {
    const { userId } = this.getCurrentUser(client);
    const room = `conversation_${data.conversation_id}`;
    // Broadcast cho người khác trong phòng (trừ người gửi)
    client.to(room).emit('user_typing', { user_id: userId, is_typing: data.is_typing });
  }
}
