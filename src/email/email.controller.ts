import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { EmailService } from './email.service';
import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { CodeGenerateForPasswordRequest } from './dto/code-generate-for-password-request.dto';
import { PasswordResetRequest } from './dto/password-reset-request.dto';
import { UpdatePasswordRequest } from './dto/update-password-request.dto';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';

@ApiTags('Email')
@Controller('auth/email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('v1/email-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '이메일 인증 코드 발송' })
  @ApiResponse({ status: 200, description: '인증 코드 발송 성공' })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (이메일 형식 오류 등)',
  })
  async sendEmailForVerification(
    @Body() sendVerificationCodeDto: SendVerificationCodeDto,
  ) {
    await this.emailService.sendVerificationCode(sendVerificationCodeDto.email);
    return { message: '인증 코드가 발송되었습니다.' };
  }

  @Get('v1/email-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '이메일 인증 코드 검증' })
  @ApiResponse({ status: 200, description: '인증 성공', type: Boolean })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (인증 코드 불일치 등)',
  })
  async verifyEmail(
    @Query('email') email: string,
    @Query('code') code: string,
  ) {
    await this.emailService.verifyCode(email, code);
    return true;
  }

  @Delete('v1/email-verification/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '이메일 인증 취소' })
  @ApiResponse({ status: 204, description: '인증 취소 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async cancelEmailVerification(@Query('email') email: string) {
    await this.emailService.cancelVerification(email);
  }

  @Post('v1/password/reissue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 재설정 인증 코드 발송' })
  @ApiResponse({ status: 200, description: '인증 코드 발송 성공' })
  @ApiResponse({ status: 400, description: '잘못된 요청' })
  async sendEmailForReissuePassword(
    @Body() request: CodeGenerateForPasswordRequest,
  ) {
    await this.emailService.sendEmailForRecoveryPassword(request.email);
  }

  @Patch('v1/password/reissue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 재설정' })
  @ApiResponse({ status: 200, description: '비밀번호 재설정 성공' })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (인증 코드 불일치 등)',
  })
  async reissuePassword(@Body() request: PasswordResetRequest) {
    return this.emailService.reissuePassword(request.email, request.authCode);
  }

  @Patch('v1/password/update')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '비밀번호 변경' })
  @ApiResponse({ status: 200, description: '비밀번호 변경 성공' })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (기존 비밀번호 불일치 등)',
  })
  async updatePassword(
    @GetUser() member: Member,
    @Body() request: UpdatePasswordRequest,
  ) {
    await this.emailService.changePassword(
      member.email,
      request.nowPassword,
      request.newPassword,
    );
  }
}
