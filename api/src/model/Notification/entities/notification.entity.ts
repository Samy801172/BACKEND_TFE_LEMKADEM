import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../User/entities/user.entity';

export enum NotificationType {
  EVENT_INVITATION = 'EVENT_INVITATION',
  EVENT_REMINDER = 'EVENT_REMINDER',
  NEW_MESSAGE = 'NEW_MESSAGE',
  CONTACT_REQUEST = 'CONTACT_REQUEST',
  EVENT_CANCELLED = 'EVENT_CANCELLED',
  PARTICIPATION_STATUS = 'PARTICIPATION_STATUS',
  EVENT_FULL = 'EVENT_FULL'
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: NotificationType
  })
  type: NotificationType;

  @Column({ default: false })
  is_read: boolean;

  @ManyToOne(() => User)
  recipient: User;

  @Column('jsonb', { nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
} 