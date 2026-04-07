import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

export enum VerifyStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
}

@Entity('partners')
export class Partner {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  user_id!: number;

  @Column()
  categories_id!: number;

  @Column()
  band_name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Index({ spatial: true })
  @Column({ type: 'point', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  location_gps!: string;

  @Column({ type: 'enum', enum: VerifyStatus, default: VerifyStatus.PENDING })
  verifi_status!: VerifyStatus;

  @Column({ nullable: true })
  cover_image!: string;

  @Column({ nullable: true })
  location_name!: string;
}