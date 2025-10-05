import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountController } from './controllers/account.controller';
import { AccountService } from './services/account.service';
import { User } from '../User/entities/user.entity';
import { SecurityModule } from '@feature/security';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    SecurityModule,
  ],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService]
})
export class AccountModule {} 