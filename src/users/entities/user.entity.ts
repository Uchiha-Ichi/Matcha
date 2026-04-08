import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Partner } from '../../partners/entities/partner.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  full_name!: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ unique: true, length: 20, nullable: true })
  phone?: string;

  @Column({ length: 255, nullable: true })
  password?: string;

  @Column({ unique: true, nullable: true })
  google_id?: string;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ nullable: true })
  avatar_src?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  @ManyToOne(() => Role, (role) => role.users, { onDelete: 'SET NULL', nullable: true, eager: false })
  @JoinColumn({ name: 'role_id' })
  role?: Role;

  @OneToOne(() => Partner, (partner) => partner.user)
  partner?: Partner;

  @OneToMany(() => Booking, (booking) => booking.user)
  bookings?: Booking[];
}