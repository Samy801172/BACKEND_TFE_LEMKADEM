import { Repository } from 'typeorm';
import { User } from '@model/User/entities/user.entity';
import { Credential } from '../data/entity/credential.entity';
declare const JwtStrategy_base: new (...args: any[]) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly userRepository;
    private readonly credentialRepository;
    private readonly logger;
    constructor(userRepository: Repository<User>, credentialRepository: Repository<Credential>);
    validate(payload: any): Promise<{
        userId: string;
        role: string;
        email: string;
        username: string;
    }>;
}
export {};
