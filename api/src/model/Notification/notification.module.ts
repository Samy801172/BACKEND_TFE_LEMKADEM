import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationService } from '@common/services/notification.service';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '@common/services/mail.module';
import { NotificationController } from './notification.controller';
import { User } from '../User/entities/user.entity';
import { FcmToken } from '../User/entities/fcm-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      User,
      FcmToken
    ]),
    ConfigModule,
    MailModule
  ],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService]
})
export class NotificationModule {} 