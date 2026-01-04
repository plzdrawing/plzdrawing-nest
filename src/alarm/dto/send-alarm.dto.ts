import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendAlarmDto {
  @IsString()
  @IsNotEmpty()
  targetToken: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  link?: string;
}
