import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Scrap } from '../entities/scrap.entity';
import { Post } from '../entities/post.entity';
import { ScrapStatusResponseDto } from './dto/scrap-status-response.dto';

@Injectable()
export class ScrapService {
  constructor(
    @InjectRepository(Scrap)
    private readonly scrapRepository: Repository<Scrap>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}

  async scrapPost(
    memberId: number,
    postId: number,
  ): Promise<ScrapStatusResponseDto> {
    await this.assertPostExists(postId);

    const existing = await this.scrapRepository.findOne({
      where: { memberId, postId },
    });
    if (!existing) {
      await this.scrapRepository.save(
        this.scrapRepository.create({ memberId, postId }),
      );
    }

    return { postId, scrapped: true };
  }

  async unscrapPost(
    memberId: number,
    postId: number,
  ): Promise<ScrapStatusResponseDto> {
    await this.assertPostExists(postId);

    await this.scrapRepository.delete({ memberId, postId });
    return { postId, scrapped: false };
  }

  private async assertPostExists(postId: number): Promise<void> {
    const post = await this.postRepository.findOne({ where: { id: postId } });
    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }
  }
}
