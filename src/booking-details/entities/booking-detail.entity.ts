import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('booking_details')
export class BookingDetail {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  booking_id!: number;

  @Column()
  partner_concept_id!: number;
}