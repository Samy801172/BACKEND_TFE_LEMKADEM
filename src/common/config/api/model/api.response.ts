import { ApiCodeResponse } from "../enum";

export interface ApiResponse{
  code:ApiCodeResponse;
  data:any;
  result:boolean;

}