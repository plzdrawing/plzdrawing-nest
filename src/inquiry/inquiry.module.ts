import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AwsModule } from '../common/aws/aws.module';
import { InquiryImage } from '../entities/inquiry-image.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { InquiryController } from './inquiry.controller';
import { InquiryService } from './inquiry.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry, InquiryImage]), AwsModule],
  controllers: [InquiryController],
  providers: [InquiryService],
})
export class InquiryModule {}
