import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthCredentialsDto } from './auth-credentials.dto';

describe('AuthCredentialsDto', () => {
  it('이메일 입력값을 정규화한다', async () => {
    const dto = plainToInstance(AuthCredentialsDto, {
      email: ' USER@Example.com ',
      password: 'pass1234',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
  });
});
