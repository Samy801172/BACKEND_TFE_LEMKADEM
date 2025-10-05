import { User } from './user.entity';
export declare class FcmToken {
    id: string;
    token: string;
    platform: string;
    is_active: boolean;
    user: User;
    user_id: string;
    created_at: Date;
    updated_at: Date;
}
