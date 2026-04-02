import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from '../entities/inquiry.entity';
import { InquiryController } from './inquiry.controller';
import { InquiryService } from './inquiry.service';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry])],
  controllers: [InquiryController],
  providers: [InquiryService],
})
export class InquiryModule {}
