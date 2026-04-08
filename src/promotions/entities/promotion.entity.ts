import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 50 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: 0 })
  discount_percentage!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discount_amount!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  max_discount?: number;

  @Column({ type: 'datetime', nullable: true })
  expired_at?: Date;

  @Column({ default: true })
  is_active!: boolean;
}