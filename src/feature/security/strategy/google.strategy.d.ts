import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { SecurityService } from '../service/security.service';
declare const GoogleStrategy_base: new (...args: any[]) => Strategy;
export declare class GoogleStrategy extends GoogleStrategy_base {
    private readonly securityService;
    private readonly logger;
    constructor(securityService: SecurityService);
    validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any>;
}
export {};
