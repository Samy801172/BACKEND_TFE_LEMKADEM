import { Credential } from './credential.entity';
export declare class Token {
    token_id: string;
    token: string;
    refreshToken: string;
    created_at: Date;
    credential: Credential;
}
