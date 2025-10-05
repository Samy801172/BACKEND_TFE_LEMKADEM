import { User } from '../../User/entities/user.entity';
export declare enum NotificationType {
    EVENT_INVITATION = "EVENT_INVITATION",
    EVENT_REMINDER = "EVENT_REMINDER",
    NEW_MESSAGE = "NEW_MESSAGE",
    CONTACT_REQUEST = "CONTACT_REQUEST",
    EVENT_CANCELLED = "EVENT_CANCELLED",
    PARTICIPATION_STATUS = "PARTICIPATION_STATUS",
    EVENT_FULL = "EVENT_FULL"
}
export declare class Notification {
    id: string;
    title: string;
    content: string;
    type: NotificationType;
    is_read: boolean;
    recipient: User;
    metadata: Record<string, any>;
    createdAt: Date;
}
