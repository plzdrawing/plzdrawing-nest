import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberRole } from '../common/enums';
import { Member } from '../entities/member.entity';
import { Notice } from '../entities/notice.entity';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { NoticeResponseDto } from './dto/notice-response.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';

@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(Notice)
    private readonly noticeRepository: Repository<Notice>,
  ) {}

  async findAll(): Promise<NoticeResponseDto[]> {
    const notices = await this.noticeRepository.find({
      order: { createdAt: 'DESC' },
    });

    return notices.map(
      (notice) =>
        new NoticeResponseDto(
          notice.id,
          notice.title,
          notice.content,
          notice.createdAt,
        ),
    );
  }

  async findOne(id: number): Promise<NoticeResponseDto> {
    const notice = await this.noticeRepository.findOne({ where: { id } });
    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    return new NoticeResponseDto(
      notice.id,
      notice.title,
      notice.content,
      notice.createdAt,
    );
  }

  async create(
    member: Member,
    dto: CreateNoticeDto,
  ): Promise<NoticeResponseDto> {
    this.assertAdmin(member);

    const notice = await this.noticeRepository.save(
      this.noticeRepository.create({
        adminId: member.id,
        title: dto.title,
        content: dto.content,
      }),
    );

    return this.mapNotice(notice);
  }

  async update(
    member: Member,
    id: number,
    dto: UpdateNoticeDto,
  ): Promise<NoticeResponseDto> {
    this.assertAdmin(member);

    const notice = await this.noticeRepository.findOne({ where: { id } });
    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    if (dto.title !== undefined) {
      notice.title = dto.title;
    }
    if (dto.content !== undefined) {
      notice.content = dto.content;
    }

    const savedNotice = await this.noticeRepository.save(notice);
    return this.mapNotice(savedNotice);
  }

  async remove(member: Member, id: number): Promise<void> {
    this.assertAdmin(member);

    const notice = await this.noticeRepository.findOne({ where: { id } });
    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    await this.noticeRepository.remove(notice);
  }

  private assertAdmin(member: Member): void {
    if (member.role !== MemberRole.ROLE_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
  }

  private mapNotice(notice: Notice): NoticeResponseDto {
    return new NoticeResponseDto(
      notice.id,
      notice.title,
      notice.content,
      notice.createdAt,
    );
  }
}
