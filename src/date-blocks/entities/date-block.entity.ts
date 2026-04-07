import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('date_blocks')
export class DateBlock {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  partner_id!: number;

  @Column({ type: 'date' })
  date_block!: Date;
}