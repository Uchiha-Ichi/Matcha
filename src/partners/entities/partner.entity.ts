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

  @Column({
    type: 'point',
    transformer: {
      // DB → code: MySQL trả binary/object, chuyển thành WKT string "POINT(lng lat)"
      from: (value: any): string | null => {
        if (!value) return null;
        if (typeof value === 'string') return value
        // TypeORM MySQL driver trả { x: lng, y: lat }
        if (typeof value === 'object' && 'x' in value && 'y' in value) {
          return `POINT(${value.x} ${value.y})`
        }
        return String(value)
      },
      // code → DB: luôn lưu dạng WKT string
      to: (value: any): string | null => {
        if (!value) return null;
        if (typeof value === 'string') return value
        if (typeof value === 'object' && 'x' in value) {
          return `POINT(${value.x} ${value.y})`
        }
        return String(value)
      },
    },
  })
  location_gps!: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ nullable: true })
  cover_image?: string;

  @Column({ nullable: true })
  location_name?: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating_avg: number;

  @Column({ type: 'int', default: 0 })
  rating_count!: number;

  @OneToOne(() => User, (user) => user.partner, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Category, (cat) => cat.partners, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categories_id' })
  category?: Category;

  @OneToMany(() => PartnerConcept, (pc) => pc.partner)
  partner_concepts?: PartnerConcept[];
}