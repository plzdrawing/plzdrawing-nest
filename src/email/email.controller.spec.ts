import { Test, TestingModule } from '@nestjs/testing';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

describe('EmailController', () => {
  let controller: EmailController;

  const mockEmailService = {
    sendVerificationCode: jest.fn(),
    verifyCode: jest.fn(),
    cancelVerification: jest.fn(),
    sendEmailForRecoveryPassword: jest.fn(),
    reissuePassword: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailController],
      providers: [
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    controller = module.get<EmailController>(EmailController);
  });

  it('정의되어 있어야 한다', () => {
    expect(controller).toBeDefined();
  });

  it('sendEmailForVerification은 코드 발송 후 메시지를 반환한다', async () => {
    mockEmailService.sendVerificationCode.mockResolvedValue(undefined);

    await expect(
      controller.sendEmailForVerification({ email: 'a@test.com' } as any),
    ).resolves.toEqual({ message: '인증 코드가 발송되었습니다.' });
    expect(mockEmailService.sendVerificationCode).toHaveBeenCalledWith(
      'a@test.com',
    );
  });

  it('verifyEmail은 서비스 검증 후 true를 반환한다', async () => {
    mockEmailService.verifyCode.mockResolvedValue(true);

    await expect(controller.verifyEmail('a@test.com', '123456')).resolves.toBe(
      true,
    );
    expect(mockEmailService.verifyCode).toHaveBeenCalledWith(
      'a@test.com',
      '123456',
    );
  });

  it('cancelEmailVerification은 서비스에 위임한다', async () => {
    await controller.cancelEmailVerification('a@test.com');

    expect(mockEmailService.cancelVerification).toHaveBeenCalledWith(
      'a@test.com',
    );
  });

  it('sendEmailForReissuePassword는 서비스에 위임한다', async () => {
    await controller.sendEmailForReissuePassword({
      email: 'a@test.com',
    } as any);

    expect(mockEmailService.sendEmailForRecoveryPassword).toHaveBeenCalledWith(
      'a@test.com',
    );
  });

  it('reissuePassword는 서비스 결과를 반환한다', async () => {
    mockEmailService.reissuePassword.mockResolvedValue(true);

    await expect(
      controller.reissuePassword({
        email: 'a@test.com',
        authCode: '111111',
      } as any),
    ).resolves.toBe(true);

    expect(mockEmailService.reissuePassword).toHaveBeenCalledWith(
      'a@test.com',
      '111111',
    );
  });

  it('updatePassword는 로그인 사용자 이메일로 비밀번호 변경을 호출한다', async () => {
    await controller.updatePassword(
      { email: 'member@test.com' } as any,
      { nowPassword: 'old', newPassword: 'new' } as any,
    );

    expect(mockEmailService.changePassword).toHaveBeenCalledWith(
      'member@test.com',
      'old',
      'new',
    );
  });
});
