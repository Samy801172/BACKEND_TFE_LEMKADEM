import { Entity, PrimaryGeneratedColumn, ManyToOne, Unique, Column } from 'typeorm';
import { User } from '../../User/entities/user.entity';

// Enum pour le statut de la demande de contact
export enum ContactStatus {
  PENDING = 'pending', // Demande en attente d'acceptation
  ACCEPTED = 'accepted', // Demande acceptée
  REFUSED = 'refused' // Demande refusée
}

@Entity('contacts')
@Unique(['owner', 'contact'])
export class Contact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.contacts, { eager: true })
  owner: User;  // Celui qui envoie la demande

  @ManyToOne(() => User, { eager: true })
  contact: User;// Celui qui reçoit

  // Statut de la demande de contact (pending, accepted, refused)
  @Column({ type: 'enum', enum: ContactStatus, default: ContactStatus.PENDING })
  status: ContactStatus;
} 