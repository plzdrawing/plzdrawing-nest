import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MemberModule } from '../member/member.module';
import { RedisModule } from '../common/redis/redis.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';
import { assertRequiredAuthEnv, REQUIRED_AUTH_ENV_KEYS } from './auth-env';
import { AuthTokenBlacklistService } from './auth-token-blacklist.service';

@Module({
  imports: [
    MemberModule,
    RedisModule,
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
    AuthTokenBlacklistService,
    JwtStrategy,
    GoogleStrategy,
    KakaoStrategy,
    KakaoAuthGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const authEnv = REQUIRED_AUTH_ENV_KEYS.reduce<
      Record<string, string | undefined>
    >((acc, key) => {
      acc[key] = this.configService.get<string>(key);
      return acc;
    }, {});

    assertRequiredAuthEnv(authEnv, isProduction);
  }
}
