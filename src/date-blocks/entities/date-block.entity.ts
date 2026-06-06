import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Partner } from '../../partners/entities/partner.entity';

@Entity('date_blocks')
export class DateBlock {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'date' })
  date_block!: string;

  @Column({ type: 'time', nullable: true })
  start_time?: string;

  @Column({ type: 'time', nullable: true })
  end_time?: string;

  // Quan hệ: Nhiều ngày bị chặn thuộc về một Partner
  @ManyToOne(() => Partner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partner_id' })
  partner!: Partner;
}