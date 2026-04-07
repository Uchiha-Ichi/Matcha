import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('partner_concepts')
export class PartnerConcept {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  partner_id!: number;

  @Column()
  concept_id!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column()
  time!: string; // Ví dụ: '2 hours', '1 day'

  @Column({ type: 'text', nullable: true })
  image_des!: string;
}