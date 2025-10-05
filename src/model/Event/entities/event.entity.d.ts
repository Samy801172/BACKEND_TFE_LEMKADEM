import { User } from '../../User/entities/user.entity';
import { EventParticipation } from './event-participation.entity';
import { Category } from '../../Category/entities/category.entity';
import { EventType } from '../enums/event-type.enum';
export declare class Event {
    id: string;
    title: string;
    description: string;
    location: string;
    date: Date;
    price: number;
    max_participants: number;
    type_event: EventType;
    image_url?: string;
    is_cancelled: boolean;
    cancellation_reason?: string;
    organizer: User;
    participations: EventParticipation[];
    categories: Category[];
}
