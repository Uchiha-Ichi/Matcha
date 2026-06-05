import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cart } from './cart.entity';
import { PartnerConcept } from '../../partner-concepts/entities/partner-concept.entity';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @CreateDateColumn()
  created_at!: Date;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart!: Cart;

  @Column({ nullable: true })
  cart_id?: number;

  @ManyToOne(() => PartnerConcept, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'partner_concept_id' })
  partner_concept!: PartnerConcept;

  @Column({ nullable: true })
  partner_concept_id?: number;
}
