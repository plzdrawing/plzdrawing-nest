import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { AuthCredentialsDto } from './dto/auth-credentials.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { MemberResponseDto } from '../member/dto/member-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  getProfile(@Request() req) {
    return req.user;
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: '구글 로그인' })
  async googleAuth(@Request() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: '구글 로그인 콜백' })
  @ApiResponse({
    status: 302,
    description: '로그인 성공 후 프론트엔드로 리다이렉트',
  })
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    const { access_token } = await this.authService.oAuthLogin(req.user);
    res.redirect(`http://localhost:3000/oauth/callback?token=${access_token}`);
  }

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({
    summary: '카카오 로그인 진입',
    description: '사용자를 카카오 로그인 페이지로 리다이렉트합니다.',
  })
  async kakaoAuth(@Request() req) {}

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({
    summary: '카카오 로그인 콜백',
    description:
      '카카오 인증 완료 후, 유저 정보를 조회하여 JWT 토큰을 발급하고 프론트엔드 URL로 리다이렉트합니다.',
  })
  @ApiResponse({
    status: 302,
    description: '로그인 성공 후 프론트엔드로 리다이렉트',
  })
  async kakaoAuthRedirect(@Request() req, @Res() res: Response) {
    const { access_token } = await this.authService.oAuthLogin(req.user);
    res.redirect(`http://localhost:3000/oauth/callback?token=${access_token}`);
  }
}
