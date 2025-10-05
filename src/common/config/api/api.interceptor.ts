import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { ApiCodeResponse } from "./enum";
import { configManager } from '@common/config';
import { ConfigKey } from "../enum";
import { isNil } from "lodash";
import { Observable, map, catchError } from "rxjs";

@Injectable()
export class ApiInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ApiInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const path = ctx.getRequest().route.path;
    const req = ctx.getRequest();

    if (path.includes('webhook')) {
      return next.handle();
    }

    return next
      .handle()
      .pipe(
        map((response: any) => {
          // Log supprimé pour éviter la pollution de la console
          return { code: this.map(path), data: response, result: true };
        }),
        catchError((error) => {
          this.logger.error(error);
          /**
           * IMPORTANT :
           * Ne pas transformer les erreurs en succès HTTP (ex: return of(...)) !
           * Sinon, le client (Angular, Postman, etc.) reçoit toujours un code 200/201 même en cas d'erreur (404, 500, ...),
           * ce qui empêche la gestion correcte des erreurs côté frontend.
           *
           * Solution professionnelle :
           * On relance l'erreur pour que le HttpExceptionFilter de NestJS gère le code HTTP approprié.
           */
          throw error;
        })
      );
  }

  map(path: String): ApiCodeResponse {
    // Log supprimé pour éviter les logs non professionnels
    const part = path
      .replace(configManager.getValue(ConfigKey.APP_BASE_URL), '')
      .split('/')
      .filter(s => s.length > 0)
      .slice(0, 2)
      .map(s => s.toUpperCase());

    const code = ApiCodeResponse[`${part.join('_')}_SUCCESS` as keyof typeof ApiCodeResponse];
    return isNil(code) ? ApiCodeResponse.COMMON_SUCCESS : code;
  }
}
