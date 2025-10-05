import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailTestController } from './mail-test.controller';

@Module({
  providers: [MailService],
  controllers: [MailTestController],
  exports: [MailService]
})
export class MailModule {} 