import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  const mockAppService = {
    getHello: jest.fn().mockReturnValue('Hello World!'),
  };
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('development');

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: mockAppService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('헬로 월드 문자열을 반환해야 한다', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('chat-test', () => {
    it('개발 환경에서는 테스트 페이지를 반환해야 한다', () => {
      const res = {
        sendFile: jest.fn(),
      };

      appController.getChatTest(res as never);

      expect(res.sendFile).toHaveBeenCalledWith(
        expect.stringContaining('public/chat-test.html'),
      );
    });

    it('운영 환경에서는 테스트 페이지를 숨겨야 한다', () => {
      mockConfigService.get.mockReturnValue('production');
      const res = {
        sendFile: jest.fn(),
      };

      expect(() => appController.getChatTest(res as never)).toThrow(
        NotFoundException,
      );
      expect(res.sendFile).not.toHaveBeenCalled();
    });
  });
});
