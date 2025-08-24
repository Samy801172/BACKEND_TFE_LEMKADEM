import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventController } from './event.controller';
import { EventService } from './services/event.service';
import { Event } from './entities/event.entity';
import { EventParticipation } from './entities/event-participation.entity';
import { SecurityModule } from '@feature/security/security.module';
import { PaymentModule } from '../Payment/payment.module';
import { MailService } from '@common/services/mail.service';
import { MailModule } from '@common/services/mail.module';
import { UserModule } from '../User/user.module';
import { NotificationModule } from '../Notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventParticipation]),
    SecurityModule,
    PaymentModule,
    MailModule,
    UserModule,
    NotificationModule
  ],
  controllers: [EventController],
  providers: [EventService, MailService],
  exports: [EventService]
})
export class EventModule {} 