import { Controller, Get, NotFoundException, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { join } from 'path';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('chat-test')
  getChatTest(@Res() res: Response) {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new NotFoundException();
    }

    return res.sendFile(join(process.cwd(), 'public', 'chat-test.html'));
  }
}
