import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Partner } from '../../partners/entities/partner.entity';
import { Concept } from '../../concepts/entities/concept.entity';

@Entity('partner_concepts')
export class PartnerConcept {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price!: number;

  @Column({ length: 100, nullable: true })
  time?: string;

  @Column({ type: 'text', nullable: true })
  image_des?: string;

  @ManyToOne(() => Partner, (p) => p.partner_concepts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'partner_id' })
  partner!: Partner;

  @ManyToOne(() => Concept, (c) => c.partner_concepts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'concept_id' })
  concept!: Concept;
}