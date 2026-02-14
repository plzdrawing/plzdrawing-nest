import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';

@Injectable()
export class AwsService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('BUCKET_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY'),
        secretAccessKey: this.configService.get<string>('AWS_SECRET_KEY'),
      },
    });
    this.bucketName = this.configService.get<string>('BUCKET_NAME');
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file) {
      throw new BadRequestException('파일이 존재하지 않습니다.');
    }

    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const fileName = `${folder}/${basename}-${Date.now()}${ext}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileName,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      // S3 URL 반환
      return `https://${this.bucketName}.s3.${this.configService.get<string>('BUCKET_REGION')}.amazonaws.com/${fileName}`;
    } catch (error) {
      console.error('S3 Upload Error:', error);
      throw new BadRequestException('이미지 업로드에 실패했습니다.');
    }
  }

  createPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.getSignerClient(), command, {
      expiresIn: expiresInSeconds,
    });
  }

  createPresignedGetUrl(key: string, expiresInSeconds = 600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });
    return getSignedUrl(this.getSignerClient(), command, {
      expiresIn: expiresInSeconds,
    });
  }

  async uploadFiles(
    files: Express.Multer.File[],
    folder: string,
  ): Promise<string[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    const key = this.extractKeyFromUrl(fileUrl);
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      console.error('S3 Delete Error:', error);
      throw new BadRequestException('이미지 삭제에 실패했습니다.');
    }
  }

  private extractKeyFromUrl(url: string): string {
    const urlParts = url.split('.com/');
    return urlParts[1];
  }

  private getSignerClient(): Parameters<typeof getSignedUrl>[0] {
    return this.s3Client as unknown as Parameters<typeof getSignedUrl>[0];
  }
}
