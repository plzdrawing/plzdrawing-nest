import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import { InquiryStatus, MemberRole } from '../common/enums';
import { AwsService } from '../common/aws/aws.service';
import { InquiryImage } from '../entities/inquiry-image.entity';
import { Inquiry } from '../entities/inquiry.entity';
import { Member } from '../entities/member.entity';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { InquiryResponseDto } from './dto/inquiry-response.dto';
import { UpdateInquiryAdminDto } from './dto/update-inquiry-admin.dto';

@Injectable()
export class InquiryService {
  private static readonly INQUIRY_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

  constructor(
    @InjectRepository(Inquiry)
    private readonly inquiryRepository: Repository<Inquiry>,
    @InjectRepository(InquiryImage)
    private readonly inquiryImageRepository: Repository<InquiryImage>,
    private readonly awsService: AwsService,
  ) {}

  async create(
    memberId: number,
    dto: CreateInquiryDto,
    files?: Express.Multer.File[],
  ): Promise<InquiryResponseDto> {
    this.validateInquiryImages(files);

    const inquiry = await this.inquiryRepository.save(
      this.inquiryRepository.create({
        memberId,
        category: dto.category,
        title: dto.title,
        content: dto.content,
        status: InquiryStatus.PENDING,
      }),
    );

    if (files && files.length > 0) {
      const imageUrls = await this.awsService.uploadFiles(files, 'inquiry');
      await this.inquiryImageRepository.save(
        imageUrls.map((imageUrl) =>
          this.inquiryImageRepository.create({
            inquiryId: inquiry.id,
            imageUrl,
          }),
        ),
      );
    }

    return this.findOne(memberId, inquiry.id);
  }

  async findMine(memberId: number): Promise<InquiryResponseDto[]> {
    const inquiries = await this.inquiryRepository.find({
      where: { memberId },
      relations: ['images'],
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
      relations: ['images'],
    });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }
    if (inquiry.memberId !== memberId) {
      throw new ForbiddenException('Forbidden inquiry access');
    }

    return this.mapInquiry(inquiry);
  }

  async findAllForAdmin(member: Member): Promise<InquiryResponseDto[]> {
    this.assertAdmin(member);

    const inquiries = await this.inquiryRepository.find({
      relations: ['images'],
      order: { createdAt: 'DESC' },
    });

    return inquiries.map((inquiry) => this.mapInquiry(inquiry));
  }

  async findOneForAdmin(
    member: Member,
    inquiryId: number,
  ): Promise<InquiryResponseDto> {
    this.assertAdmin(member);

    const inquiry = await this.inquiryRepository.findOne({
      where: { id: inquiryId },
      relations: ['images'],
    });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    return this.mapInquiry(inquiry);
  }

  async updateByAdmin(
    member: Member,
    inquiryId: number,
    dto: UpdateInquiryAdminDto,
  ): Promise<InquiryResponseDto> {
    this.assertAdmin(member);

    const inquiry = await this.inquiryRepository.findOne({
      where: { id: inquiryId },
      relations: ['images'],
    });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found');
    }

    if (dto.status === InquiryStatus.ANSWERED && !dto.answer?.trim()) {
      throw new BadRequestException(
        'Answer is required when status is ANSWERED',
      );
    }

    inquiry.status = dto.status;
    inquiry.adminId = member.id;

    if (dto.answer !== undefined) {
      inquiry.answer = dto.answer;
    }
    if (dto.status === InquiryStatus.ANSWERED) {
      inquiry.answeredAt = new Date();
    }
    if (dto.status === InquiryStatus.CLOSED) {
      inquiry.closedAt = new Date();
    }

    const savedInquiry = await this.inquiryRepository.save(inquiry);
    return this.mapInquiry(savedInquiry);
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
      inquiry.images?.map((image) => image.imageUrl) ?? [],
    );
  }

  private assertAdmin(member: Member): void {
    if (member.role !== MemberRole.ROLE_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private validateInquiryImages(files?: Express.Multer.File[]): void {
    if (!files || files.length === 0) {
      return;
    }

    if (files.length > 3) {
      throw new BadRequestException('Inquiry images can contain up to 3 files');
    }

    files.forEach((file) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const isSupportedMime = InquiryService.INQUIRY_IMAGE_MIME_TYPES.has(
        file.mimetype,
      );
      const isSupportedExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

      if (!isSupportedMime || !isSupportedExt) {
        throw new BadRequestException(
          'Inquiry image must be jpg, jpeg, png, or webp',
        );
      }
    });
  }
}
