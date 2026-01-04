import {
  Injectable,
  BadRequestException,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import Redis from 'ioredis';
import { MemberService } from '../member/member.service';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly memberService: MemberService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false, // 587 포트는 false, 465 포트는 true
      auth: {
        user: this.configService.get<string>('MAIL_USERNAME'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendVerificationCode(email: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration =
      this.configService.get<number>('AUTH_CODE_EXPIRATION') || 180000; // 기본 3분

    // Redis에 인증 코드 저장 (유효기간 설정)
    await this.redis.set(email, code, 'PX', expiration);

    const mailOptions = {
      from: this.configService.get<string>('MAIL_USERNAME'),
      to: email,
      subject: '[PlzDrawing] 이메일 인증 코드',
      text: `인증 코드: ${code}`,
      html: `
        <div style="font-family: 'Apple SD Gothic Neo', 'sans-serif' !important; width: 540px; height: 600px; border-top: 4px solid #02b875; margin: 100px auto; padding: 30px 0; box-sizing: border-box;">
          <h1 style="margin: 0; padding: 0 5px; font-size: 28px; font-weight: 400;">
            <span style="font-size: 15px; margin: 0 0 10px 3px;">PlzDrawing</span><br />
            <span style="color: #02b875;">메일인증</span> 안내입니다.
          </h1>
          <p style="font-size: 16px; line-height: 26px; margin-top: 50px; padding: 0 5px;">
            안녕하세요.<br />
            PlzDrawing에 가입해 주셔서 진심으로 감사드립니다.<br />
            아래 <b style="color: #02b875;">'인증 코드'</b>를 입력하여 회원가입을 완료해 주세요.<br />
            감사합니다.
          </p>
          <p style="font-size: 16px; margin: 40px 5px 20px; line-height: 28px;">
            인증 코드: <br />
            <span style="font-size: 24px;">${code}</span>
          </p>
          <div style="border-top: 1px solid #DDD; padding: 5px;"></div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async verifyCode(email: string, code: string): Promise<boolean> {
    const storedCode = await this.redis.get(email);
    if (!storedCode) {
      throw new BadRequestException(
        '인증 코드가 만료되었거나 존재하지 않습니다.',
      );
    }
    if (storedCode !== code) {
      throw new BadRequestException('인증 코드가 일치하지 않습니다.');
    }
    // 인증 성공 시 Redis에서 코드 삭제
    await this.redis.del(email);
    return true;
  }

  async cancelVerification(email: string): Promise<void> {
    await this.redis.del(email);
  }

  async sendEmailForRecoveryPassword(email: string): Promise<void> {
    const member = await this.memberService.findByEmail(email);
    if (!member) {
      throw new NotFoundException('가입되지 않은 이메일입니다.');
    }
    await this.sendVerificationCode(email);
  }

  async reissuePassword(email: string, authCode: string): Promise<boolean> {
    await this.verifyCode(email, authCode);

    const newPassword = Math.random().toString(36).slice(-8);
    await this.memberService.updatePassword(email, undefined, newPassword);

    const mailOptions = {
      from: this.configService.get<string>('MAIL_USERNAME'),
      to: email,
      subject: '[PlzDrawing] 임시 비밀번호 발급',
      text: `임시 비밀번호: ${newPassword}`,
      html: `
        <div style="font-family: 'Apple SD Gothic Neo', 'sans-serif' !important; width: 540px; height: 600px; border-top: 4px solid #02b875; margin: 100px auto; padding: 30px 0; box-sizing: border-box;">
          <h1 style="margin: 0; padding: 0 5px; font-size: 28px; font-weight: 400;">
            <span style="font-size: 15px; margin: 0 0 10px 3px;">PlzDrawing</span><br />
            <span style="color: #02b875;">임시 비밀번호</span> 안내입니다.
          </h1>
          <p style="font-size: 16px; line-height: 26px; margin-top: 50px; padding: 0 5px;">
            안녕하세요.<br />
            요청하신 임시 비밀번호를 발송해 드립니다.<br />
            로그인 후 반드시 비밀번호를 변경해 주세요.<br />
            감사합니다.
          </p>
          <p style="font-size: 16px; margin: 40px 5px 20px; line-height: 28px;">
            임시 비밀번호: <br />
            <span style="font-size: 24px;">${newPassword}</span>
          </p>
          <div style="border-top: 1px solid #DDD; padding: 5px;"></div>
        </div>
      `,
    };

    await this.transporter.sendMail(mailOptions);
    return true;
  }

  async changePassword(
    email: string,
    oldPassword?: string,
    newPassword?: string,
  ): Promise<void> {
    await this.memberService.updatePassword(email, oldPassword, newPassword);
  }
}
