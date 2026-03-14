import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_CHAT_IMAGE_SIZE_BYTES } from '../chat.constants';

export class ChatImageUploadRequestDto {
  @ApiProperty({
    description: 'FE에서 업로드할 원본 파일명 (파일 바이너리는 전송하지 않음)',
    example: 'dog.png',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'FE에서 업로드할 파일의 MIME 타입',
    example: 'image/png',
  })
  @IsString()
  contentType: string;

  @ApiProperty({
    description: 'FE에서 업로드할 파일 크기 (bytes)',
    example: 5242880,
  })
  @IsInt()
  @Min(1)
  @Max(MAX_CHAT_IMAGE_SIZE_BYTES)
  size: number;

  @ApiProperty({
    description: '이미지 너비 (px)',
    example: 1200,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @ApiProperty({
    description: '이미지 높이 (px)',
    example: 900,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  height?: number;
}
