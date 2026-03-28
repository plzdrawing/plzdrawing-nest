import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ScrapService } from './scrap.service';
import { Scrap } from '../entities/scrap.entity';
import { Post } from '../entities/post.entity';

describe('ScrapService', () => {
  let service: ScrapService;
  let scrapRepository: any;
  let postRepository: any;

  beforeEach(async () => {
    scrapRepository = {
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(),
      delete: jest.fn(),
    };
    postRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScrapService,
        { provide: getRepositoryToken(Scrap), useValue: scrapRepository },
        { provide: getRepositoryToken(Post), useValue: postRepository },
      ],
    }).compile();

    service = module.get<ScrapService>(ScrapService);
  });

  it('정의되어 있어야 한다', () => {
    expect(service).toBeDefined();
  });

  describe('scrapPost', () => {
    it('게시글이 없으면 NotFoundException을 던진다', async () => {
      postRepository.findOne.mockResolvedValue(null);

      await expect(service.scrapPost(1, 100)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('기존 찜이 없으면 새로 저장하고 true를 반환한다', async () => {
      postRepository.findOne.mockResolvedValue({ id: 10 });
      scrapRepository.findOne.mockResolvedValue(null);

      await expect(service.scrapPost(2, 10)).resolves.toEqual({
        postId: 10,
        scrapped: true,
      });
      expect(scrapRepository.create).toHaveBeenCalledWith({
        memberId: 2,
        postId: 10,
      });
      expect(scrapRepository.save).toHaveBeenCalled();
    });

    it('기존 찜이 있으면 저장 없이 true를 반환한다', async () => {
      postRepository.findOne.mockResolvedValue({ id: 10 });
      scrapRepository.findOne.mockResolvedValue({
        id: 1,
        memberId: 2,
        postId: 10,
      });

      await expect(service.scrapPost(2, 10)).resolves.toEqual({
        postId: 10,
        scrapped: true,
      });
      expect(scrapRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('unscrapPost', () => {
    it('게시글이 없으면 NotFoundException을 던진다', async () => {
      postRepository.findOne.mockResolvedValue(null);

      await expect(service.unscrapPost(1, 100)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('멱등하게 찜 해제를 수행하고 false를 반환한다', async () => {
      postRepository.findOne.mockResolvedValue({ id: 55 });
      scrapRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.unscrapPost(7, 55)).resolves.toEqual({
        postId: 55,
        scrapped: false,
      });
      expect(scrapRepository.delete).toHaveBeenCalledWith({
        memberId: 7,
        postId: 55,
      });
    });
  });
});
