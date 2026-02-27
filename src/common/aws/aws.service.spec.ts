import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import * as presigner from '@aws-sdk/s3-request-presigner';
import { AwsService } from './aws.service';

describe('AwsService', () => {
  let service: AwsService;
  let sendMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  const configService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'BUCKET_REGION':
          return 'ap-northeast-2';
        case 'AWS_ACCESS_KEY':
          return 'ak';
        case 'AWS_SECRET_KEY':
          return 'sk';
        case 'BUCKET_NAME':
          return 'bucket-name';
        default:
          return null;
      }
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    service = new AwsService(configService as unknown as ConfigService);
    sendMock = jest.fn();
    (service as any).s3Client = { send: sendMock };
    (service as any).bucketName = 'bucket-name';
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('uploadFile', () => {
    it('파일이 없으면 BadRequestException을 던진다', async () => {
      await expect(service.uploadFile(null as any, 'profile')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('S3 업로드 성공 시 공개 URL을 반환한다', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
      sendMock.mockResolvedValue({});

      const result = await service.uploadFile(
        {
          originalname: 'avatar.png',
          buffer: Buffer.from('x'),
          mimetype: 'image/png',
        } as any,
        'profile',
      );

      expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
      expect(result).toContain(
        'https://bucket-name.s3.ap-northeast-2.amazonaws.com/',
      );
      expect(result).toContain('profile/avatar-1700000000000.png');
    });

    it('S3 업로드 실패 시 BadRequestException으로 변환한다', async () => {
      sendMock.mockRejectedValue(new Error('s3 fail'));

      await expect(
        service.uploadFile(
          {
            originalname: 'a.jpg',
            buffer: Buffer.from('x'),
            mimetype: 'image/jpeg',
          } as any,
          'profile',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'S3 Upload Error:',
        expect.any(Error),
      );
    });
  });

  it('createPresignedUploadUrl은 PutObjectCommand로 서명 URL을 생성한다', async () => {
    jest
      .spyOn(presigner, 'getSignedUrl')
      .mockResolvedValue('https://signed-upload' as any);

    await expect(
      service.createPresignedUploadUrl('chat/key.png', 'image/png', 120),
    ).resolves.toBe('https://signed-upload');

    expect(presigner.getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(PutObjectCommand),
      { expiresIn: 120 },
    );
  });

  it('createPresignedGetUrl은 GetObjectCommand로 서명 URL을 생성한다', async () => {
    jest
      .spyOn(presigner, 'getSignedUrl')
      .mockResolvedValue('https://signed-get' as any);

    await expect(
      service.createPresignedGetUrl('chat/key.png', 90),
    ).resolves.toBe('https://signed-get');
    expect(presigner.getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(GetObjectCommand),
      { expiresIn: 90 },
    );
  });

  it('uploadFiles는 각 파일 업로드를 병렬 호출한다', async () => {
    const spy = jest
      .spyOn(service, 'uploadFile')
      .mockResolvedValueOnce('u1')
      .mockResolvedValueOnce('u2');

    await expect(
      service.uploadFiles(
        [{ originalname: '1' }, { originalname: '2' }] as any,
        'p',
      ),
    ).resolves.toEqual(['u1', 'u2']);
    expect(spy).toHaveBeenNthCalledWith(1, { originalname: '1' }, 'p');
    expect(spy).toHaveBeenNthCalledWith(2, { originalname: '2' }, 'p');
  });

  describe('deleteFile', () => {
    it('URL에서 key를 추출해 삭제한다', async () => {
      sendMock.mockResolvedValue({});

      await service.deleteFile(
        'https://bucket-name.s3.ap-northeast-2.amazonaws.com/folder/a.png',
      );

      expect(sendMock).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    });

    it('S3 삭제 실패 시 BadRequestException으로 변환한다', async () => {
      sendMock.mockRejectedValue(new Error('delete fail'));

      await expect(
        service.deleteFile(
          'https://bucket-name.s3.ap-northeast-2.amazonaws.com/folder/a.png',
        ),
      ).rejects.toThrow(BadRequestException);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'S3 Delete Error:',
        expect.any(Error),
      );
    });
  });
});
