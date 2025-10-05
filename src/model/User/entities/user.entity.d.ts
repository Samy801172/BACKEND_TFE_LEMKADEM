import { UserRole } from './user-role.enum';
import { Message } from '../../Message/entities/message.entity';
import { Event } from '../../Event/entities/event.entity';
import { EventParticipation } from '../../Event/entities/event-participation.entity';
import { Contact } from '../../Contact/entities/contact.entity';
export declare class User {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    password: string;
    type_user: UserRole;
    telephone?: string;
    entreprise?: string;
    secteur?: string;
    bio?: string;
    photo?: string;
    linkedin?: string;
    fcm_token?: string;
    isActive: boolean;
    created_at: Date;
    updated_at: Date;
    organizedEvents: Event[];
    eventParticipations: EventParticipation[];
    sentMessages: Message[];
    receivedMessages: Message[];
    contacts: Contact[];
}
