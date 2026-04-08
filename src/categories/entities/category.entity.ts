import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Partner } from '../../partners/entities/partner.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ nullable: true })
  icon_src?: string;

  @OneToMany(() => Partner, (partner) => partner.category)
  partners?: Partner[];
}