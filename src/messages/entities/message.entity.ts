import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Conversation } from '../../conversations/entities/conversation.entity';
import { User } from '../../users/entities/user.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file'
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type!: MessageType;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ default: false })
  is_read!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation!: Conversation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Message, { nullable: true })
  @JoinColumn({ name: 'reply_to_id' })
  reply_to?: Message;
}