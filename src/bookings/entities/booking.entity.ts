import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum BookingStatus {
  PENDING = 'pending',
  DEPOSITED = 'deposited',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  user_id!: number;

  @Column()
  partner_id!: number;

  @Column({ nullable: true })
  promotion_id!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price_discount!: number;

  @CreateDateColumn()
  created_at!: Date;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status!: BookingStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price_deposit!: number;

  @Column({ type: 'datetime' })
  booking_time!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  remaining_amout!: number;
}