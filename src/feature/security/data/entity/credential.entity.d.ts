import { Token } from './token.entity';
export declare class Credential {
    credential_id: string;
    username: string;
    password: string;
    mail: string;
    facebookHash: string;
    googleHash: string;
    isAdmin: boolean;
    active: boolean;
    created: Date;
    updated: Date;
    resetToken: string;
    resetTokenExpires: Date;
    tokens: Token[];
}
