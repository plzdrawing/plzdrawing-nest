import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type TossConfirmResponse = {
  paymentKey: string;
  orderId: string;
  totalAmount: number;
  status: string;
  method?: string;
  approvedAt?: string;
};

@Injectable()
export class TossPaymentsService {
  constructor(private readonly configService: ConfigService) {}

  async confirmPayment(
    paymentKey: string,
    orderId: string,
    amount: number,
  ): Promise<TossConfirmResponse> {
    const secretKey = this.configService.get<string>(
      'TOSS_PAYMENTS_SECRET_KEY',
    );
    if (!secretKey) {
      throw new InternalServerErrorException(
        'TOSS_PAYMENTS_SECRET_KEY is not configured',
      );
    }

    const baseUrl =
      this.configService.get<string>('TOSS_PAYMENTS_API_BASE_URL') ??
      'https://api.tosspayments.com';

    const authValue = Buffer.from(`${secretKey}:`).toString('base64');
    const response = await fetch(`${baseUrl}/v1/payments/confirm`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authValue}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount,
      }),
    });

    const body = (await response.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;

    if (!response.ok) {
      const message =
        typeof body?.message === 'string'
          ? body.message
          : 'Failed to confirm Toss payment';

      if (response.status >= 400 && response.status < 500) {
        throw new BadRequestException(message);
      }
      throw new BadGatewayException(message);
    }

    return body as TossConfirmResponse;
  }
}
