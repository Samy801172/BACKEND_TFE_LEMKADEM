import { ApiOperationOptions } from "@nestjs/swagger";


export const AppControllerHelloWorld
  : ApiOperationOptions = {
  summary: 'Hello world',
  description: "My great description for this method",
}
export const AppControllerHelloWorld2: ApiOperationOptions ={summary:'sum', description:'desc'}