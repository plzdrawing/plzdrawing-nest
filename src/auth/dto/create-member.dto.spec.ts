import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMemberDto } from './create-member.dto';

describe('CreateMemberDto', () => {
  it('이메일과 닉네임 입력값을 정규화한다', async () => {
    const dto = plainToInstance(CreateMemberDto, {
      email: ' USER@Example.com ',
      password: 'pass1234',
      nickname: ' 홍길동123 ',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('user@example.com');
    expect(dto.nickname).toBe('홍길동123');
  });

  it('닉네임이 20자를 초과하면 검증 오류가 발생한다', async () => {
    const dto = plainToInstance(CreateMemberDto, {
      email: 'user@example.com',
      password: 'pass1234',
      nickname: '가'.repeat(21),
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'nickname')).toBe(true);
  });

  it('닉네임에 특수문자가 포함되면 검증 오류가 발생한다', async () => {
    const dto = plainToInstance(CreateMemberDto, {
      email: 'user@example.com',
      password: 'pass1234',
      nickname: '홍길동!',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'nickname')).toBe(true);
  });
});
