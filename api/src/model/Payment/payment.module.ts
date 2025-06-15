import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './payment.controller';
import { Event } from '../Event/entities/event.entity';
import { User } from '../User/entities/user.entity';
import { EventParticipation } from '../Event/entities/event-participation.entity';
import { ConfigModule } from '@nestjs/config';
import { Document } from '../Document/entities/document.entity';
import { MailModule } from '../../common/services/mail.module';
import { NotificationModule } from '@model/Notification/notification.module';

// Module Payment : centralise les providers, controllers et services liés au paiement (Stripe, factures, remboursements)
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Event,
      User,
      EventParticipation,
      Document
    ]),
    ConfigModule,
    MailModule,
    NotificationModule
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService]
})
export class PaymentModule {} 