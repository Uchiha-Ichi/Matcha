import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ImageTargetType {
  PARTNER = 'partner',
  CONCEPT = 'concept',
  PARTNER_CONCEPT = 'partner_concept',
}

@Entity('images')
export class Image {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'enum',
    enum: ImageTargetType,
  })
  target_type!: ImageTargetType;

  @Column({ type: 'int' })
  target_id!: number;

  @Column({ length: 255 })
  image_src!: string;

  @Column({ type: 'tinyint', default: 0 })
  is_primary!: number;

  @CreateDateColumn({ type: 'datetime', precision: 6 })
  created_at!: Date;
}
