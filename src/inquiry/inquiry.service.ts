import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InquiryStatus } from '../common/enums';
import { Inquiry } from '../entities/inquiry.entity';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { InquiryResponseDto } from './dto/inquiry-response.dto';

@Injectable()
export class InquiryService {
  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
  ) {}

  async create(
    memberId: number,
    dto: CreateInquiryDto,
  ): Promise<InquiryResponseDto> {
    const inquiry = await this.inquiryRepository.save(
      this.inquiryRepository.create({
        memberId,
        category: dto.category,
        title: dto.title,
        content: dto.content,
        status: InquiryStatus.PENDING,
      }),
    );

    return this.mapInquiry(inquiry);
  }

  async findMine(memberId: number): Promise<InquiryResponseDto[]> {
    const inquiries = await this.inquiryRepository.find({
      where: { memberId },
      order: { createdAt: 'DESC' },
    });

    return inquiries.map((inquiry) => this.mapInquiry(inquiry));
  }

  async findOne(
    memberId: number,
    inquiryId: number,
  ): Promise<InquiryResponseDto> {
    const inquiry = await this.inquiryRepository.findOne({
      where: { id: inquiryId },
    });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }
    if (inquiry.memberId !== memberId) {
      throw new ForbiddenException('Forbidden inquiry access');
    }

    return this.mapInquiry(inquiry);
  }

  private mapInquiry(inquiry: Inquiry): InquiryResponseDto {
    return new InquiryResponseDto(
      inquiry.id,
      inquiry.category,
      inquiry.title,
      inquiry.content,
      inquiry.status,
      inquiry.answer ?? null,
      inquiry.createdAt,
      inquiry.answeredAt ?? null,
    );
  }
}
