import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Tag } from '../entities/tag.entity';
import { PostTag } from '../entities/post-tag.entity';
import { MemberTag } from '../entities/member-tag.entity';
import { Post } from '../entities/post.entity';
import { Member } from '../entities/member.entity';
import { TagStatus } from '../common/enums';

@Injectable()
export class TagService {
  constructor(
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(PostTag)
    private readonly postTagRepository: Repository<PostTag>,
    @InjectRepository(MemberTag)
    private readonly memberTagRepository: Repository<MemberTag>,
  ) {}

  async syncTags(post: Post, tagNames: string[]): Promise<void> {
    if (!tagNames || tagNames.length === 0) {
      // 모든 태그 비활성화
      await this.postTagRepository.update(
        { postId: post.id, status: TagStatus.ACTIVE },
        { status: TagStatus.INACTIVE },
      );
      return;
    }

    // 1. 태그 정규화 (소문자, 중복 제거)
    const normalizedTags = [
      ...new Set(tagNames.map((name) => name.toLowerCase())),
    ];

    // 2. 기존 태그 조회 및 생성
    const tags = await this.getOrCreateTags(normalizedTags);

    // 3. PostTag 연결 관리
    const tagIds = tags.map((tag) => tag.id);
    const existingPostTags = await this.postTagRepository.find({
      where: { postId: post.id, tagId: In(tagIds) },
    });

    const existingTagIds = existingPostTags.map((pt) => pt.tagId);

    // 3-1. 새로 연결해야 할 태그
    const newTagIds = tagIds.filter((id) => !existingTagIds.includes(id));
    const newPostTags = newTagIds.map((tagId) =>
      this.postTagRepository.create({
        postId: post.id,
        tagId,
        status: TagStatus.ACTIVE,
      }),
    );
    if (newPostTags.length > 0) {
      await this.postTagRepository.save(newPostTags);
    }

    // 3-2. 기존 연결 중 비활성화된 것 활성화
    const toActivate = existingPostTags.filter(
      (pt) => pt.status !== TagStatus.ACTIVE,
    );
    if (toActivate.length > 0) {
      await this.postTagRepository.update(
        { id: In(toActivate.map((pt) => pt.id)) },
        { status: TagStatus.ACTIVE },
      );
    }

    // 3-3. 요청에 없는 태그 비활성화
    const currentActiveTags = await this.postTagRepository.find({
      where: { postId: post.id, status: TagStatus.ACTIVE },
    });

    const tagsToDeactivate = currentActiveTags.filter(
      (pt) => !tagIds.includes(pt.tagId),
    );
    if (tagsToDeactivate.length > 0) {
      await this.postTagRepository.update(
        { id: In(tagsToDeactivate.map((pt) => pt.id)) },
        { status: TagStatus.INACTIVE },
      );
    }
  }

  async syncMemberTags(member: Member, tagNames: string[]): Promise<void> {
    if (!tagNames || tagNames.length === 0) {
      await this.memberTagRepository.update(
        { memberId: member.id, status: TagStatus.ACTIVE },
        { status: TagStatus.INACTIVE },
      );
      return;
    }

    const normalizedTags = [
      ...new Set(tagNames.map((name) => name.toLowerCase())),
    ];
    const tags = await this.getOrCreateTags(normalizedTags);
    const tagIds = tags.map((tag) => tag.id);

    const existingMemberTags = await this.memberTagRepository.find({
      where: { memberId: member.id, tagId: In(tagIds) },
    });

    const existingTagIds = existingMemberTags.map((mt) => mt.tagId);

    const newTagIds = tagIds.filter((id) => !existingTagIds.includes(id));
    const newMemberTags = newTagIds.map((tagId) =>
      this.memberTagRepository.create({
        memberId: member.id,
        tagId,
        status: TagStatus.ACTIVE,
      }),
    );
    if (newMemberTags.length > 0) {
      await this.memberTagRepository.save(newMemberTags);
    }

    const toActivate = existingMemberTags.filter(
      (mt) => mt.status !== TagStatus.ACTIVE,
    );
    if (toActivate.length > 0) {
      await this.memberTagRepository.update(
        { id: In(toActivate.map((mt) => mt.id)) },
        { status: TagStatus.ACTIVE },
      );
    }

    const currentActiveTags = await this.memberTagRepository.find({
      where: { memberId: member.id, status: TagStatus.ACTIVE },
    });

    const tagsToDeactivate = currentActiveTags.filter(
      (mt) => !tagIds.includes(mt.tagId),
    );
    if (tagsToDeactivate.length > 0) {
      await this.memberTagRepository.update(
        { id: In(tagsToDeactivate.map((mt) => mt.id)) },
        { status: TagStatus.INACTIVE },
      );
    }
  }

  async findTagsByContentIds(
    postIds: number[],
  ): Promise<Map<number, string[]>> {
    if (postIds.length === 0) return new Map();

    const postTags = await this.postTagRepository.find({
      where: { postId: In(postIds), status: TagStatus.ACTIVE },
      relations: ['tag'],
    });

    const map = new Map<number, string[]>();
    postTags.forEach((pt) => {
      if (!map.has(pt.postId)) {
        map.set(pt.postId, []);
      }
      if (pt.tag) {
        map.get(pt.postId).push(pt.tag.name);
      }
    });
    return map;
  }

  private async getOrCreateTags(tagNames: string[]): Promise<Tag[]> {
    const existingTags = await this.tagRepository.find({
      where: { name: In(tagNames) },
    });

    const existingNames = existingTags.map((tag) => tag.name);
    const newNames = tagNames.filter((name) => !existingNames.includes(name));

    const newTags = newNames.map((name) =>
      this.tagRepository.create({
        name,
        status: TagStatus.ACTIVE,
      }),
    );

    if (newTags.length > 0) {
      const savedTags = await this.tagRepository.save(newTags);
      return [...existingTags, ...savedTags];
    }

    return existingTags;
  }
}
