import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import { MemberService } from '../member/member.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('EmailService', () => {
  let service: EmailService;
  let mockRedis: any;
  let mockMemberService: any;
  let sendMailMock: jest.Mock;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'MAIL_HOST':
          return 'smtp.example.com';
        case 'MAIL_PORT':
          return 587;
        case 'MAIL_USERNAME':
          return 'user@example.com';
        case 'MAIL_PASSWORD':
          return 'password';
        case 'AUTH_CODE_EXPIRATION':
          return 180000;
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockRedis = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };
    mockMemberService = {
      findByEmail: jest.fn(),
      updatePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
        {
          provide: MemberService,
          useValue: mockMemberService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    sendMailMock = jest.fn().mockResolvedValue(undefined);
    (service as any).transporter = { sendMail: sendMailMock };
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationCode', () => {
    it('인증 코드를 Redis에 저장하고 메일을 전송한다', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.123456);

      await service.sendVerificationCode('a@test.com');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'a@test.com',
        expect.any(String),
        'PX',
        180000,
      );
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'user@example.com',
          to: 'a@test.com',
          subject: '[PlzDrawing] 이메일 인증 코드',
        }),
      );
    });
  });

  describe('verifyCode', () => {
    it('저장된 코드가 없으면 BadRequestException을 던진다', async () => {
      mockRedis.get.mockResolvedValue(null);

      await expect(service.verifyCode('a@test.com', '111111')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('코드가 불일치하면 BadRequestException을 던진다', async () => {
      mockRedis.get.mockResolvedValue('123456');

      await expect(service.verifyCode('a@test.com', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('코드가 일치하면 Redis에서 삭제 후 true를 반환한다', async () => {
      mockRedis.get.mockResolvedValue('123456');

      await expect(service.verifyCode('a@test.com', '123456')).resolves.toBe(
        true,
      );
      expect(mockRedis.del).toHaveBeenCalledWith('a@test.com');
    });
  });

  it('cancelVerification은 Redis key를 삭제한다', async () => {
    await service.cancelVerification('a@test.com');

    expect(mockRedis.del).toHaveBeenCalledWith('a@test.com');
  });

  describe('sendEmailForRecoveryPassword', () => {
    it('가입된 회원이 아니면 NotFoundException을 던진다', async () => {
      mockMemberService.findByEmail.mockResolvedValue(null);

      await expect(
        service.sendEmailForRecoveryPassword('none@test.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('가입된 회원이면 인증 코드 발송을 호출한다', async () => {
      mockMemberService.findByEmail.mockResolvedValue({ id: 1 });
      const sendSpy = jest
        .spyOn(service, 'sendVerificationCode')
        .mockResolvedValue(undefined);

      await service.sendEmailForRecoveryPassword('a@test.com');

      expect(sendSpy).toHaveBeenCalledWith('a@test.com');
    });
  });

  describe('reissuePassword', () => {
    it('인증 후 임시 비밀번호를 갱신하고 메일을 전송한다', async () => {
      const verifyCodeSpy = jest
        .spyOn(service, 'verifyCode')
        .mockResolvedValue(true);
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
      mockMemberService.updatePassword.mockResolvedValue(undefined);

      await expect(
        service.reissuePassword('a@test.com', '123456'),
      ).resolves.toBe(true);

      expect(verifyCodeSpy).toHaveBeenCalledWith('a@test.com', '123456');
      expect(mockMemberService.updatePassword).toHaveBeenCalledWith(
        'a@test.com',
        undefined,
        expect.any(String),
      );
      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'a@test.com',
          subject: '[PlzDrawing] 임시 비밀번호 발급',
        }),
      );
    });
  });

  it('changePassword는 memberService.updatePassword에 위임한다', async () => {
    await service.changePassword('a@test.com', 'old', 'new');

    expect(mockMemberService.updatePassword).toHaveBeenCalledWith(
      'a@test.com',
      'old',
      'new',
    );
  });
});
