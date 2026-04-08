import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Partner } from '../../partners/entities/partner.entity';
import { Promotion } from '../../promotions/entities/promotion.entity';
import { BookingDetail } from '../../booking-details/entities/booking-detail.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  price_discount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  price_deposit!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  remaining_amount?: number;

  @Column({ type: 'datetime' })
  booking_time!: Date;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status!: BookingStatus;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Partner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partner_id' })
  partner!: Partner;

  @ManyToOne(() => Promotion, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'promotion_id' })
  promotion?: Promotion;

  @OneToMany(() => BookingDetail, (bd) => bd.booking)
  details?: BookingDetail[];
}