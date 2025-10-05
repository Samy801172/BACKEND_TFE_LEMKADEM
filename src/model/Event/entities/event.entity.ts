import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { User } from '../../User/entities/user.entity';
import { EventParticipation } from './event-participation.entity';
import { Category } from '../../Category/entities/category.entity';
import { EventType } from '../enums/event-type.enum';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column()
  location: string;

  @Column()
  date: Date;

  @Column()
  price: number;

  @Column()
  max_participants: number;

  @Column({
    type: 'enum',
    enum: EventType,
  })
  type_event: EventType;

  @Column({ nullable: true })
  image_url?: string;

  @Column({ default: false })
  is_cancelled: boolean;

  // NOTE: Le champ is_validated a été supprimé car seuls les admins créent des événements
  // Il n'y a donc pas besoin de workflow de validation

  @Column({ nullable: true })
  cancellation_reason?: string;

  @ManyToOne(() => User, user => user.organizedEvents)
  organizer: User;

  @OneToMany(() => EventParticipation, participation => participation.event)
  participations: EventParticipation[];

  @ManyToMany(() => Category)
  @JoinTable()
  categories: Category[];
}