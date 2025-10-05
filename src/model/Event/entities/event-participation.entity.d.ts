import { User } from '../../User/entities/user.entity';
import { Event } from './event.entity';
export declare enum ParticipationStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    CONFIRMED = "CONFIRMED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED",
    ADDED_TO_AGENDA = "ADDED_TO_AGENDA"
}
export declare enum PaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    FREE = "FREE",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED"
}
export declare class EventParticipation {
    id: string;
    event: Event;
    eventId: string;
    participant: User;
    participantId: string;
    status: ParticipationStatus;
    payment_intent_id?: string;
    payment_status: PaymentStatus;
    createdAt: Date;
    added_to_agenda_at?: Date;
    last_payment_attempt_at?: Date;
    payment_attempts_count: number;
}
