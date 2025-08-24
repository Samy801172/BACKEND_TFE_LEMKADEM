/**
 * Entité Payment : représente un paiement Stripe pour un événement
 * - Lié à un utilisateur et un événement
 * - Stocke le statut, le montant, la référence, etc.
 */
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../User/entities/user.entity';
import { Event } from '../../Event/entities/event.entity';

/**
 * Statut d'une transaction de paiement Stripe
 */
export enum PaymentTransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.PENDING
  })
  status: PaymentTransactionStatus;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Event)
  event: Event;

  @Column({ nullable: true })
  transaction_id: string;

  @Column({ nullable: true })
  payment_method: string;

  @Column({ nullable: true })
  reference: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  refundedAt: Date;

  @Column({ nullable: true })
  refund_reason: string;

  @Column({ nullable: true })
  stripe_refund_id: string;

  @Column({ nullable: true })
  stripe_payment_intent_id: string;

  @Column({ nullable: true })
  refunded_amount: number;
} 