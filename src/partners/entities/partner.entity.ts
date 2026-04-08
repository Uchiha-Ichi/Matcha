import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { PartnerConcept } from '../../partner-concepts/entities/partner-concept.entity';

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  band_name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'point' }) 
  location_gps!: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ nullable: true })
  cover_image?: string;

  @Column({ nullable: true })
  location_name?: string;

  @OneToOne(() => User, (user) => user.partner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Category, (cat) => cat.partners, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categories_id' })
  category?: Category;

  @OneToMany(() => PartnerConcept, (pc) => pc.partner)
  partner_concepts?: PartnerConcept[];
}