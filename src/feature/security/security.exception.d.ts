import { ApiException } from '@common/config/api/model/api.exception';
export declare class NoTokenFoundedException extends ApiException {
    constructor();
}
export declare class UserNotFoundException extends ApiException {
    constructor();
}
export declare class TokenExpiredException extends ApiException {
    constructor();
}
export declare class SignupException extends ApiException {
    constructor();
}
export declare class CredentialDeleteException extends ApiException {
    constructor();
}
export declare class UserAlreadyExistException extends ApiException {
    constructor();
}
export declare class TokenGenerationException extends ApiException {
    constructor();
}
