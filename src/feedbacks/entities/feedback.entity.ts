import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BookingDetail } from '../../booking-details/entities/booking-detail.entity';

export enum FeedbackStatus {
  VISIBLE = 'visible',
  HIDDEN = 'hidden'
}

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ nullable: true })
  image?: string;

  @Column({ type: 'enum', enum: FeedbackStatus, default: FeedbackStatus.VISIBLE })
  status!: FeedbackStatus;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => BookingDetail, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_detail_id' })
  booking_detail!: BookingDetail;
}