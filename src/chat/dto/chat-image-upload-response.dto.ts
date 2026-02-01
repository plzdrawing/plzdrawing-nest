import { ApiProperty } from '@nestjs/swagger';

export class ChatImageUploadResponseDto {
  @ApiProperty({
    description: 'S3 업로드 presigned URL',
    example: 'https://s3-presigned-put-url',
  })
  uploadUrl: string;

  @ApiProperty({
    description: 'S3 object key',
    example: 'chat/12/2026/02/uuid.png',
  })
  objectKey: string;

  @ApiProperty({
    description: 'URL 만료 시각(ISO)',
    example: '2026-02-01T12:00:00Z',
  })
  expiresAt: string;
}
