import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import { ApiCodeResponse } from "./enum";
import { Observable } from "rxjs";
export declare class ApiInterceptor implements NestInterceptor {
    private readonly logger;
    intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
    map(path: String): ApiCodeResponse;
}
