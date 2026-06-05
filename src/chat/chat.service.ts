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
  async getOrCreateConversation(userId: number, dto: CreateConversationDto): Promise<Conversation> {
    const { partner_id, booking_id } = dto;

    // Tìm conversation đã tồn tại
    const existing = await this.conversationRepo.findOne({
      where: {
        user: { id: userId },
        partner: { id: partner_id },
        ...(booking_id ? { booking: { id: booking_id } } : {}),
      },
      relations: ['user', 'partner', 'booking'],
    });

    if (existing) return existing;

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException(`Không tìm thấy user #${userId}`);

    const partner = await this.partnerRepo.findOne({ where: { id: partner_id } });
    if (!partner) throw new NotFoundException(`Không tìm thấy partner #${partner_id}`);

    let booking: Booking | undefined = undefined;
    if (booking_id) {
      const found = await this.bookingRepo.findOne({ where: { id: booking_id } });
      if (!found) throw new NotFoundException(`Không tìm thấy booking #${booking_id}`);
      booking = found;
    }

    const conversation = this.conversationRepo.create({ user, partner, booking });
    return this.conversationRepo.save(conversation);
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
      .orderBy('conv.updated_at', 'DESC');

    if (roles.includes('admin')) {
      // Admin xem tất cả
    } else if (roles.includes('partner')) {
      qb.where('partner.user = :userId', { userId });
    } else {
      qb.where('user.id = :userId', { userId });
    }

    return qb.getMany();
  }

  /**
   * Lấy tin nhắn trong conversation (có phân trang)
   */
  async getMessages(conversationId: number, page = 1, limit = 30): Promise<Message[]> {
    return this.messageRepo.find({
      where: { conversation: { id: conversationId } },
      relations: ['user', 'reply_to'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
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

    return this.messageRepo.findOne({
      where: { id: saved.id },
      relations: ['user', 'reply_to'],
    }) as Promise<Message>;
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
}
