import { ApiException } from "@common/config";
import { ApiCodeResponse } from "@common/config/api/enum";



export class SayHelloException extends ApiException {
  constructor() {
    // Call the super constructor with the appropriate API code response and status code
    super(ApiCodeResponse.TEST, 200);
  }
}


