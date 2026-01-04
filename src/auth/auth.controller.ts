import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
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
  async googleAuthRedirect(@Request() req) {
    return this.authService.oAuthLogin(req.user);
  }

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: '카카오 로그인' })
  async kakaoAuth(@Request() req) {}

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  @ApiOperation({ summary: '카카오 로그인 콜백' })
  async kakaoAuthRedirect(@Request() req) {
    return this.authService.oAuthLogin(req.user);
  }
}
