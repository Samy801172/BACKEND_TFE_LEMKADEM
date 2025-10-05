import { User } from '../../User/entities/user.entity';
export declare enum ContactStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    REFUSED = "refused"
}
export declare class Contact {
    id: string;
    owner: User;
    contact: User;
    status: ContactStatus;
}
