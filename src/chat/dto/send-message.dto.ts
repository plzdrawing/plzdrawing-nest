import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { MessageType } from '../../common/enums';
import { MAX_CHAT_IMAGE_SIZE_BYTES } from '../chat.constants';

export class SendMessageDto {
  @ApiPropertyOptional({
    description: '메시지 타입 (기본값 TEXT)',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({
    description: '텍스트 메시지 내용',
    example: '안녕하세요 :)',
  })
  @ValidateIf((o) => !o.type || o.type === MessageType.TEXT)
  @IsString()
  @MaxLength(1000)
  content?: string;

  @ApiPropertyOptional({
    description: '이미지 object key',
    example: 'chat/12/2026/02/uuid.png',
  })
  @ValidateIf((o) => o.type === MessageType.IMAGE)
  @IsString()
  objectKey?: string;

  @ApiPropertyOptional({
    description: '파일 크기 (bytes)',
    example: 5242880,
  })
  @ValidateIf((o) => o.type === MessageType.IMAGE)
  @IsInt()
  @Min(1)
  @Max(MAX_CHAT_IMAGE_SIZE_BYTES)
  size?: number;

  @ApiPropertyOptional({
    description: 'MIME 타입',
    example: 'image/png',
  })
  @ValidateIf((o) => o.type === MessageType.IMAGE)
  @IsString()
  mimeType?: string;

  @ApiPropertyOptional({
    description: '이미지 너비 (px)',
    example: 1200,
  })
  @ValidateIf((o) => o.type === MessageType.IMAGE)
  @IsInt()
  @Min(1)
  width?: number;

  @ApiPropertyOptional({
    description: '이미지 높이 (px)',
    example: 900,
  })
  @ValidateIf((o) => o.type === MessageType.IMAGE)
  @IsInt()
  @Min(1)
  height?: number;
}
