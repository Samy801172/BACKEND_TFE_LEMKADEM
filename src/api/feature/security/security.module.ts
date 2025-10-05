import { JwtModule, JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { Credential } from './data/entity/credential.entity';
import { Token } from './data/entity/token.entity';
import { User } from '@model/User/entities/user.entity';
import { SecurityController } from './security.controller';
import { SecurityService, TokenService } from './service';

import { configManager } from '@common/config';
import { ConfigKey } from '@common/config/enum';
import { JwtGuard } from './guards';
import { Reflector } from '@nestjs/core';
import { JwtStrategy } from './strategy/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { GoogleStrategy } from './strategy/google.strategy';
import { MailModule } from '@common/services/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Credential, Token, User]),
    JwtModule.register({
      global: true,
      secret: configManager.getValue(ConfigKey.JWT_TOKEN_SECRET),
      signOptions: { expiresIn: configManager.getValue(ConfigKey.JWT_TOKEN_EXPIRE_IN) },
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    MailModule,
  ],
  exports: [SecurityService, RolesGuard],
  providers: [
    SecurityService,
    TokenService,
    JwtGuard,
    JwtService,
    Reflector,
    JwtStrategy,
    RolesGuard,
    GoogleStrategy,
  ],
  controllers: [SecurityController],
})
export class SecurityModule {}
