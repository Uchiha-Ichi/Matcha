import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Partner } from '../../partners/entities/partner.entity';
import { Concept } from '../../concepts/entities/concept.entity';
import slugify from 'slugify';

@Entity('partner_concepts')
export class PartnerConcept {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, nullable: true })
  slug?: string;

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

  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    const conceptName = this.concept?.name || '';
    const partnerName = this.partner?.band_name || '';
    const nameToSlugify = `${conceptName} ${partnerName}`.trim() || 'service-detail';
    this.slug = slugify(nameToSlugify, {
      locale: 'vi',
      lower: true,
      strict: true
    });
  }
}