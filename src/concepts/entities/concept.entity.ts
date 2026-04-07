import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('concepts')
export class Concept {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ default: true })
  status!: boolean;
}