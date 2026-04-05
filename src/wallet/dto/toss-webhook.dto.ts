import { ApiPropertyOptional } from '@nestjs/swagger';

export class TossWebhookDto {
  @ApiPropertyOptional({ example: 'PAYMENT_STATUS_CHANGED' })
  eventType?: string;

  @ApiPropertyOptional({
    example: {
      orderId: 'coin-order-123',
      paymentKey: 'payment_key',
      status: 'DONE',
      totalAmount: 1200,
    },
  })
  data?: Record<string, unknown>;
}
