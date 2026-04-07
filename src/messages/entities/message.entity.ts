import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  SYSTEM = 'system',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  conversation_id!: number;

  @Column()
  user_id!: number;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type!: MessageType;

  @Column({ type: 'text' })
  content!: string;

  @Column({ nullable: true })
  repply_to_id!: number;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ default: false })
  is_read!: boolean;
}