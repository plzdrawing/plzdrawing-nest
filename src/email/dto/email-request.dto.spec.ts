import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CodeGenerateForPasswordRequest } from './code-generate-for-password-request.dto';
import { PasswordResetRequest } from './password-reset-request.dto';
import { SendVerificationCodeDto } from './send-verification-code.dto';
import { VerifyCodeDto } from './verify-code.dto';

describe('Email request DTOs', () => {
  it('SendVerificationCodeDto 이메일 입력값을 정규화한다', async () => {
    const dto = plainToInstance(SendVerificationCodeDto, {
      email: ' USER@Example.com ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
  });

  it('VerifyCodeDto 이메일 입력값을 정규화한다', async () => {
    const dto = plainToInstance(VerifyCodeDto, {
      email: ' USER@Example.com ',
      authCode: '123456',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
  });

  it('CodeGenerateForPasswordRequest 이메일 입력값을 정규화한다', async () => {
    const dto = plainToInstance(CodeGenerateForPasswordRequest, {
      email: ' USER@Example.com ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
  });

  it('PasswordResetRequest 이메일 입력값을 정규화한다', async () => {
    const dto = plainToInstance(PasswordResetRequest, {
      email: ' USER@Example.com ',
      authCode: '123456',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
  });
});
