import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notice } from '../entities/notice.entity';
import { NoticeResponseDto } from './dto/notice-response.dto';

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
}
