import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MessageType } from '../../common/enums';
import { SendMessageDto } from './send-message.dto';

describe('SendMessageDto', () => {
  it('텍스트 메시지를 허용한다', async () => {
    const dto = plainToInstance(SendMessageDto, {
      type: MessageType.TEXT,
      content: '안녕하세요 :)',
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('이미지 메시지를 허용한다', async () => {
    const dto = plainToInstance(SendMessageDto, {
      type: MessageType.IMAGE,
      objectKey: 'chat/12/2026/02/uuid.png',
      size: 5242880,
      mimeType: 'image/png',
      width: 1200,
      height: 900,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('클라이언트가 시스템 메시지를 전송할 수 없도록 거부한다', async () => {
    const dto = plainToInstance(SendMessageDto, {
      type: MessageType.SYSTEM,
      content: 'PAYMENT_REQUEST',
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'type')).toBe(true);
  });
});
