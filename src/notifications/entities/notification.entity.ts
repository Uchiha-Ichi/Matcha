import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Booking } from '../../bookings/entities/booking.entity';

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read'
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255, nullable: true })
  name?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD
  })
  status!: NotificationStatus;

  @CreateDateColumn({ type: 'timestamp' })
  time!: Date;

  // Quan hệ: Thông báo gửi tới một User cụ thể
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  // Quan hệ: Thông báo có thể liên quan đến một đơn đặt lịch (Booking)
  @ManyToOne(() => Booking, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;
}