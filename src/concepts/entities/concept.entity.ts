import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { PartnerConcept } from '../../partner-concepts/entities/partner-concept.entity';

@Entity('concepts')
export class Concept {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ nullable: true })
  image?: string;

  @OneToMany(() => PartnerConcept, (pc) => pc.concept)
  partner_concepts?: PartnerConcept[];
}