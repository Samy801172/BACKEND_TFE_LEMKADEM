import { HttpException, ValidationError } from "@nestjs/common";
import { ApiCodeResponse } from "../enum";
import { ApiResponse } from '@common/config';
import { isNil, result } from "lodash";


export class ApiException extends HttpException{

  constructor(code:ApiCodeResponse, status:number) {
    const apiResponse:ApiResponse =
      {
        code: code,
        data: null,
        result: false
      }
    super(apiResponse, status);
  }
}
export class ValidationException extends HttpException{

  constructor(errors: ValidationError[]) {
    const apiResponse:ApiResponse ={
      code: ApiCodeResponse.PAYLOAD_IS_NOT_VALID,
      data: errors.map((e:ValidationError) =>validationErrorToApiCodeResponse(e)).flat(),
      result : false
    }
    super(apiResponse, 499);
  }
}
export const validationErrorToApiCodeResponse = (error: ValidationError): ApiCodeResponse[] =>
{
  return Object.keys(error.constraints).map((k: string) => {
    const code = ApiCodeResponse[`${camelToSnake(error.property)}_${camelToSnake(k)}` as
      keyof typeof ApiCodeResponse];
    return isNil(code) ? ApiCodeResponse.PAYLOAD_PARAM_IS_MISSING : code;
  });
}
export const camelToSnake = (str: string): string => {
  return str.replace(/([A-Z])/g, " $1").split(' ').join('_').toUpperCase();
}