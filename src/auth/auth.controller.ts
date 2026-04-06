import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { OAuthUser } from './auth.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { MemberResponseDto } from '../member/dto/member-response.dto';
import { Member } from '../entities/member.entity';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';

type AuthRequest = Request & { user: Member };
type OAuthRequest = Request & { user: OAuthUser };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: '회원가입' })
  @ApiResponse({
    status: 201,
    description: '회원가입 성공',
    type: MemberResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (유효성 검사 실패 등)',
  })
  async register(@Body() createMemberDto: CreateMemberDto) {
    return this.authService.register(createMemberDto);
  }

  @Post('login')
  @ApiOperation({ summary: '로그인' })
  @ApiResponse({
    status: 200,
    description: '로그인 성공',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (유효성 검사 실패 등)',
  })
  @ApiResponse({ status: 401, description: '인증 실패' })
  async login(@Body() authCredentialsDto: AuthCredentialsDto) {
    const user = await this.authService.validateUser(
      authCredentialsDto.email,
      authCredentialsDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '프로필 조회' })
  @ApiResponse({
    status: 200,
    description: '프로필 조회 성공',
    type: MemberResponseDto,
  })
  getProfile(@Req() req: AuthRequest): Member {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: '로그아웃',
    description:
      '현재는 서버 측 토큰 저장소 없이 동작하므로, 호출 성공 시 프론트에서 access token을 삭제하면 됩니다.',
  })
  @ApiResponse({
    status: 200,
    description: '로그아웃 처리 성공',
    type: LogoutResponseDto,
  })
  logout(): LogoutResponseDto {
    const result = this.authService.logout();
    return new LogoutResponseDto(result.success);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: '구글 로그인' })
  googleAuth(@Req() _req: Request): void {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: '구글 로그인 콜백' })
  @ApiResponse({
    status: 302,
    description: '로그인 성공 후 프론트엔드로 리다이렉트',
  })
  async googleAuthRedirect(@Req() req: OAuthRequest, @Res() res: Response) {
    const { access_token } = await this.authService.oAuthLogin(req.user);
    res.redirect(this.buildOAuthRedirectUrl(access_token));
  }

  @Get('kakao')
  @UseGuards(KakaoAuthGuard)
  @ApiOperation({
    summary: '카카오 로그인 시작 (리다이렉트)',
    description:
      '사용자를 카카오 인증 페이지로 302 리다이렉트합니다. 네이티브 앱은 시스템 브라우저/웹뷰에서 이 엔드포인트를 열어 로그인 플로우를 시작하세요.',
  })
  @ApiResponse({
    status: 302,
    description: '카카오 인증 페이지로 리다이렉트',
  })
  @ApiResponse({
    status: 500,
    description:
      '카카오 OAuth 설정 오류 (KAKAO_CLIENT_ID / KAKAO_REDIRECT_URI 불일치 등)',
  })
  kakaoAuth(@Req() _req: Request): void {}

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({
    summary: '카카오 로그인 콜백 처리',
    description:
      '카카오 인증 완료 후 JWT를 발급하고 OAUTH_REDIRECT_URL(예: myapp://oauth/callback)로 302 리다이렉트합니다. 최종 URL 예시: myapp://oauth/callback?token={jwt}',
  })
  @ApiResponse({
    status: 302,
    description: '로그인 성공 후 앱/프론트 콜백 URL로 리다이렉트',
  })
  @ApiResponse({
    status: 401,
    description: '카카오 이메일 동의 미완료 (Email consent is required)',
  })
  @ApiResponse({
    status: 500,
    description: '카카오 토큰 교환/프로필 조회 실패 또는 서버 설정 오류',
  })
  async kakaoAuthRedirect(@Req() req: OAuthRequest, @Res() res: Response) {
    const { access_token } = await this.authService.oAuthLogin(req.user);
    res.redirect(this.buildOAuthRedirectUrl(access_token));
  }

  private buildOAuthRedirectUrl(accessToken: string): string {
    const oauthRedirectUrl =
      this.configService.get<string>('OAUTH_REDIRECT_URL');
    const memberRedirectUrl = this.configService.get<string>(
      'MEMBER_REDIRECT_URL',
    );

    const callbackBase = oauthRedirectUrl
      ? oauthRedirectUrl
      : memberRedirectUrl
        ? new URL('/oauth/callback', memberRedirectUrl).toString()
        : 'http://localhost:3000/oauth/callback';

    const redirectUrl = new URL(callbackBase);
    redirectUrl.searchParams.set('token', accessToken);
    return redirectUrl.toString();
  }
}
