import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';

export enum PaymentProvider {
  VNPAY = 'vnpay',
  PAYOS = 'payos',
}

export enum PaymentType {
  DEPOSIT = 'deposit',
  REMAINING = 'remaining',
  FULL = 'full',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PENDING = 'pending',
  PROCESSING = 'processing',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'enum', enum: PaymentProvider, default: PaymentProvider.VNPAY })
  provider!: PaymentProvider;

  @Column({ type: 'enum', enum: PaymentType, default: PaymentType.DEPOSIT })
  payment_type!: PaymentType;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID })
  status!: PaymentStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount_paid!: number;

  @Column({ length: 10, default: 'VND' })
  currency!: string;

  @Index({ unique: true })
  @Column({ length: 100, nullable: true })
  order_code?: string;

  @Index()
  @Column({ length: 100, nullable: true })
  payment_link_id?: string;

  @Column({ length: 255, nullable: true })
  transaction_ref?: string;

  @Column({ type: 'text', nullable: true })
  checkout_url?: string;

  @Column({ type: 'text', nullable: true })
  qr_code?: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @Column({ type: 'datetime', nullable: true })
  paid_at?: Date;

  @Column({ type: 'datetime', nullable: true })
  cancelled_at?: Date;

  @Column({ type: 'datetime', nullable: true })
  expired_at?: Date;

  @Column({ type: 'json', nullable: true })
  raw_response?: Record<string, any>;

  @Column({ type: 'json', nullable: true })
  raw_webhook?: Record<string, any>;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;
}
