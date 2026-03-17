import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RevisionRequestDto {
  @ApiProperty({
    description: '수정 요청 내용',
    example: '고양이 눈 조금 더 키워주세요 :)!',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;
}
