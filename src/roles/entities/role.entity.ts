import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 50 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}