import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: true })
  booking_id!: number;

  @Column()
  user_id!: number; // Đảm bảo not_null như thiết kế của bạn

  @Column()
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ default: false })
  status!: boolean; // false: chưa đọc, true: đã đọc

  @CreateDateColumn()
  time!: Date;
}