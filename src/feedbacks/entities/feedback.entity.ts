import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('feedbacks')
export class Feedback {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  user_id!: number;

  @Column()
  booking_detail_id!: number;

  @Column({ type: 'text' })
  description!: string;

  @Column({ nullable: true })
  image!: string;
}