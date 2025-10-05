import { SecurityService } from "./service";
import { Credential } from './data/entity/credential.entity';
import { Token } from './data/entity/token.entity';
import { SignInPayload, SignupPayload } from './data/payload';
import { RefreshTokenPayload } from './data/payload/refresh-token.payload';
import { UserRole } from '@model/User/entities/user-role.enum';
export declare class SecurityController {
    private readonly service;
    constructor(service: SecurityService);
    signIn(payload: SignInPayload): Promise<Token>;
    adminSignIn(payload: SignInPayload): Promise<Token>;
    signUp(payload: SignupPayload): Promise<Token>;
    adminSignUp(payload: SignupPayload): Promise<Token>;
    refresh(payload: RefreshTokenPayload): Promise<Token>;
    googleSignIn(payload: SignInPayload): Promise<Token>;
    googleAdminSignIn(payload: SignInPayload): Promise<Token>;
    googleSignUp(payload: SignupPayload): Promise<Token>;
    googleAdminSignUp(payload: SignupPayload): Promise<Token>;
    me(user: Credential): Credential;
    delete(credential_id: string): Promise<void>;
    promoteUser(userId: string, body: {
        role: UserRole;
    }): Promise<void>;
    fixAdminRole(userId: string): Promise<void>;
    checkRole(userId: string): Promise<void>;
    promoteToAdmin(userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    checkUserRole(userId: string): Promise<void>;
    restoreUser(id: string): Promise<{
        code: string;
        result: boolean;
    }>;
    googleAuth(): Promise<void>;
    googleAuthRedirect(req: any, res: any): Promise<any>;
    forgotPassword(body: {
        email: string;
    }): Promise<{
        message: string;
    }>;
    resetPassword(body: {
        token: string;
        password: string;
    }): Promise<{
        message: string;
    }>;
}
