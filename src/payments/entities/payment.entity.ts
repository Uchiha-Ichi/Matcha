import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  REFUNDED = 'refunded'
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID })
  status!: PaymentStatus;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;
}