import { Injectable } from "@nestjs/common";
import { SayHelloException } from "./app.exception";


@Injectable()

export class AppService {

  getHello(): string {
    this.checkIfIsAdmin(true);
    return 'Hello SAMY';
  }

  checkIfIsAdmin(admin: boolean): void {
    if (!admin) {
      throw new SayHelloException();
    }
  }
}