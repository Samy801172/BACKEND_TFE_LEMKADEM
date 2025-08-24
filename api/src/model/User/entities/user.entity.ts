import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from './user-role.enum';
import { Message } from '../../Message/entities/message.entity';
import { Event } from '../../Event/entities/event.entity';
import { EventParticipation } from '../../Event/entities/event-participation.entity';
import { Contact } from '../../Contact/entities/contact.entity';

// L'entité User définit la structure d'un utilisateur dans la base de données
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Informations de base de l'utilisateur
  @Column()
  nom: string;

  @Column()
  prenom: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  // Le type de compte détermine les permissions de l'utilisateur
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER
  })
  type_user: UserRole;

  // Champs optionnels pour les membres
  @Column({ nullable: true })
  telephone?: string;

  @Column({ nullable: true })
  entreprise?: string;

  @Column({ nullable: true })
  secteur?: string;

  @Column('text', { nullable: true })
  bio?: string;

  @Column({ nullable: true })
  photo?: string;

  @Column({ nullable: true })
  linkedin?: string;

  @Column({ nullable: true })
  fcm_token?: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations avec d'autres entités
  @OneToMany(() => Event, event => event.organizer)
  organizedEvents: Event[];

  @OneToMany(() => EventParticipation, participation => participation.participant)
  eventParticipations: EventParticipation[];

  @OneToMany(() => Message, message => message.sender)
  sentMessages: Message[];

  @OneToMany(() => Message, message => message.receiver)
  receivedMessages: Message[];

  @OneToMany(() => Contact, contact => contact.owner)
  contacts: Contact[];
} 