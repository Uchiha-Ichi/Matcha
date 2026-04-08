import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Partner } from '../../partners/entities/partner.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text', nullable: true })
  last_message?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Partner)
  @JoinColumn({ name: 'partner_id' })
  partner!: Partner;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;
}