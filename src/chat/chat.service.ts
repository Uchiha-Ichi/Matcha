import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '../conversations/entities/conversation.entity';
import { Message, MessageType } from '../messages/entities/message.entity';
import { User } from '../users/entities/user.entity';
import { Partner } from '../partners/entities/partner.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Partner)
    private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  /**
   * Tạo hoặc lấy lại conversation giữa user và partner
   */
  async getOrCreateConversation(userId: number, roles: string[], dto: CreateConversationDto): Promise<Conversation> {
    const { partner_id, user_id, booking_id } = dto;

    let targetUserId = userId;
    let targetPartnerId = partner_id;

    if (roles.includes('partner')) {
      const partner = await this.partnerRepo.findOne({
        where: { user: { id: userId } },
      });
      if (!partner) {
        throw new NotFoundException(`Không tìm thấy thông tin đối tác của bạn`);
      }
      targetPartnerId = partner.id;

      if (!user_id) {
        throw new NotFoundException(`Thiếu thông tin khách hàng cần nhắn tin`);
      }
      targetUserId = user_id;
    } else {
      if (!targetPartnerId) {
        throw new NotFoundException(`Thiếu thông tin đối tác cần nhắn tin`);
      }
    }

    // Tìm conversation đã tồn tại
    const existing = await this.conversationRepo.findOne({
      where: {
        user: { id: targetUserId },
        partner: { id: targetPartnerId },
        ...(booking_id ? { booking: { id: booking_id } } : {}),
      },
      relations: [
        'user',
        'partner',
        'booking',
        'booking.details',
        'booking.details.partner_concept',
        'booking.details.partner_concept.concept',
      ],
    });

    if (existing) return existing;

    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) throw new NotFoundException(`Không tìm thấy khách hàng #${targetUserId}`);

    const partner = await this.partnerRepo.findOne({ where: { id: targetPartnerId } });
    if (!partner) throw new NotFoundException(`Không tìm thấy đối tác #${targetPartnerId}`);

    let booking: Booking | undefined = undefined;
    if (booking_id) {
      const found = await this.bookingRepo.findOne({ where: { id: booking_id } });
      if (!found) throw new NotFoundException(`Không tìm thấy booking #${booking_id}`);
      booking = found;
    }

    const conversation = this.conversationRepo.create({ user, partner, booking });
    const saved = await this.conversationRepo.save(conversation);
    return this.conversationRepo.findOne({
      where: { id: saved.id },
      relations: [
        'user',
        'partner',
        'booking',
        'booking.details',
        'booking.details.partner_concept',
        'booking.details.partner_concept.concept',
      ],
    }) as Promise<Conversation>;
  }

  /**
   * Lấy danh sách conversation của user (hoặc partner)
   */
  async getConversations(userId: number, roles: string[]): Promise<Conversation[]> {
    const qb = this.conversationRepo
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.user', 'user')
      .leftJoinAndSelect('conv.partner', 'partner')
      .leftJoinAndSelect('conv.booking', 'booking')
      .leftJoinAndSelect('booking.details', 'details')
      .leftJoinAndSelect('details.partner_concept', 'partner_concept')
      .leftJoinAndSelect('partner_concept.concept', 'concept')
      .orderBy('conv.updated_at', 'DESC');

    if (roles.includes('admin')) {
      // Admin xem tất cả
    } else if (roles.includes('partner')) {
      qb.where('partner.user = :userId', { userId });
    } else {
      qb.where('user.id = :userId', { userId });
    }

    const conversations = await qb.getMany();
    return this.attachUnreadCounts(conversations, userId);
  }

  /**
   * Lấy tin nhắn trong conversation (có phân trang)
   */
  async getMessages(conversationId: number, page = 1, limit = 30): Promise<Message[]> {
    const messages = await this.messageRepo.find({
      where: { conversation: { id: conversationId } },
      relations: ['user', 'reply_to'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return messages.map(msg => {
      (msg as any).conversation_id = conversationId;
      return msg;
    });
  }

  /**
   * Lưu tin nhắn mới và cập nhật last_message của conversation
   */
  async saveMessage(senderId: number, dto: SendMessageDto): Promise<Message> {
    const { conversation_id, content, type, reply_to_id } = dto;

    const conversation = await this.conversationRepo.findOne({
      where: { id: conversation_id },
    });
    if (!conversation) throw new NotFoundException(`Không tìm thấy conversation #${conversation_id}`);

    const user = await this.userRepo.findOne({ where: { id: senderId } });
    if (!user) throw new NotFoundException(`Không tìm thấy user #${senderId}`);

    let reply_to: Message | undefined = undefined;
    if (reply_to_id) {
      const found = await this.messageRepo.findOne({ where: { id: reply_to_id } });
      if (found) reply_to = found;
    }

    const message = this.messageRepo.create({
      conversation,
      user,
      content,
      type: type ?? MessageType.TEXT,
      reply_to,
    });
    const saved = await this.messageRepo.save(message);

    // Cập nhật last_message của conversation
    conversation.last_message = content;
    await this.conversationRepo.save(conversation);

    const msg = await this.messageRepo.findOne({
      where: { id: saved.id },
      relations: ['user', 'reply_to'],
    });
    if (msg) {
      (msg as any).conversation_id = conversation_id;
    }
    return msg as Message;
  }

  /**
   * Đánh dấu tất cả tin nhắn trong conversation là đã đọc
   */
  async markAsRead(conversationId: number, userId: number): Promise<void> {
    await this.messageRepo
      .createQueryBuilder()
      .update(Message)
      .set({ is_read: true })
      .where('conversation_id = :conversationId', { conversationId })
      .andWhere('user_id != :userId', { userId }) // Không đánh dấu tin nhắn của chính mình
      .andWhere('is_read = false')
      .execute();
  }

  async getUnreadCount(userId: number, roles: string[]): Promise<{ count: number }> {
    const qb = this.messageRepo
      .createQueryBuilder('message')
      .innerJoin('message.conversation', 'conversation')
      .innerJoin('conversation.partner', 'partner')
      .where('message.is_read = false')
      .andWhere('message.user_id != :userId', { userId });

    if (roles.includes('admin')) {
      // Admin sees all unread messages from other users.
    } else if (roles.includes('partner')) {
      qb.andWhere('partner.user_id = :userId', { userId });
    } else {
      qb.andWhere('conversation.user_id = :userId', { userId });
    }

    return { count: await qb.getCount() };
  }

  private async attachUnreadCounts(conversations: Conversation[], userId: number): Promise<Conversation[]> {
    if (conversations.length === 0) return conversations;

    const rows = await this.messageRepo
      .createQueryBuilder('message')
      .select('conversation.id', 'conversationId')
      .addSelect('COUNT(message.id)', 'unreadCount')
      .innerJoin('message.conversation', 'conversation')
      .where('conversation.id IN (:...conversationIds)', {
        conversationIds: conversations.map((conversation) => conversation.id),
      })
      .andWhere('message.is_read = false')
      .andWhere('message.user_id != :userId', { userId })
      .groupBy('conversation.id')
      .getRawMany<{ conversationId: number | string; unreadCount: number | string }>();

    const unreadByConversation = new Map(
      rows.map((row) => [Number(row.conversationId), Number(row.unreadCount)]),
    );

    return conversations.map((conversation) => ({
      ...conversation,
      unread_count: unreadByConversation.get(conversation.id) ?? 0,
    } as Conversation & { unread_count: number }));
  }
}
