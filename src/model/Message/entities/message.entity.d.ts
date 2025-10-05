import { User } from '../../User/entities/user.entity';
export declare class Message {
    id: string;
    content: string;
    sender: User;
    receiver: User;
    is_read: boolean;
    createdAt: Date;
}
