import { HttpException, ValidationError } from "@nestjs/common";
import { ApiCodeResponse } from "../enum";
export declare class ApiException extends HttpException {
    constructor(code: ApiCodeResponse, status: number);
}
export declare class ValidationException extends HttpException {
    constructor(errors: ValidationError[]);
}
export declare const validationErrorToApiCodeResponse: (error: ValidationError) => ApiCodeResponse[];
export declare const camelToSnake: (str: string) => string;
