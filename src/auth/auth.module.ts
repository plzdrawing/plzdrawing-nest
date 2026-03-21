import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MemberModule } from '../member/member.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';

@Module({
  imports: [
    MemberModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const accessExpiration = configService.get<number>('ACCESS_EXPIRATION');
        const expiresIn = (
          accessExpiration ? `${accessExpiration}ms` : '1h'
        ) as NonNullable<
          NonNullable<JwtModuleOptions['signOptions']>['expiresIn']
        >;
        return {
          secret: configService.get<string>('SECRET_KEY'),
          signOptions: { expiresIn },
        };
      },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    KakaoStrategy,
    KakaoAuthGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
