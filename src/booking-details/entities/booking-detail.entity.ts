import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { PartnerConcept } from '../../partner-concepts/entities/partner-concept.entity';

@Entity('booking_details')
export class BookingDetail {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price!: number;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @ManyToOne(() => Booking, (b) => b.details, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @ManyToOne(() => PartnerConcept, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'partner_concept_id' })
  partner_concept?: PartnerConcept;
}