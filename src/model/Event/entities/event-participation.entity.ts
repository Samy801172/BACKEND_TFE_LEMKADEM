import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Column, JoinColumn } from 'typeorm';
import { User } from '../../User/entities/user.entity';
import { Event } from './event.entity';

export enum ParticipationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  ADDED_TO_AGENDA = 'ADDED_TO_AGENDA'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FREE = 'FREE',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

@Entity('event_participations')
export class EventParticipation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Event, event => event.participations)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column()
  eventId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'participantId' })
  participant: User;

  @Column()
  participantId: string;

  @Column({
    type: 'enum',
    enum: ParticipationStatus,
    default: ParticipationStatus.PENDING
  })
  status: ParticipationStatus;

  @Column({ nullable: true })
  payment_intent_id?: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING
  })
  payment_status: PaymentStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  added_to_agenda_at?: Date;

  @Column({ nullable: true })
  last_payment_attempt_at?: Date;

  @Column({ default: 0 })
  payment_attempts_count: number;
} 