import { ApiProperty } from '@nestjs/swagger';
import { MemberRole, MemberProvider } from '../../common/enums';
import type { Member } from '../../entities/member.entity';

export class MemberResponseDto {
  @ApiProperty({ description: '회원 ID', example: 1 })
  id: number;

  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: '닉네임', example: '홍길동' })
  nickname: string;

  @ApiProperty({
    description: '역할',
    enum: MemberRole,
    example: MemberRole.ROLE_MEMBER,
  })
  role: MemberRole;

  @ApiProperty({
    description: '가입 경로',
    enum: MemberProvider,
    example: MemberProvider.EMAIL,
  })
  provider: MemberProvider;

  @ApiProperty({ description: '생성일', example: '2023-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: '수정일', example: '2023-01-01T00:00:00.000Z' })
  updatedAt: Date;

  constructor(
    member: Pick<
      Member,
      | 'id'
      | 'email'
      | 'nickname'
      | 'role'
      | 'provider'
      | 'createdAt'
      | 'updatedAt'
    >,
  ) {
    this.id = member.id;
    this.email = member.email;
    this.nickname = member.nickname;
    this.role = member.role;
    this.provider = member.provider;
    this.createdAt = member.createdAt;
    this.updatedAt = member.updatedAt;
  }
}
