import { PostFeedMapper } from './post-feed.mapper';

describe('PostFeedMapper', () => {
  let mapper: PostFeedMapper;

  beforeEach(() => {
    mapper = new PostFeedMapper();
  });

  it('toLatestContentsResponse는 업로더/콘텐츠를 조합해 반환한다', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');
    const post: any = {
      id: 1,
      member: { nickname: '작가' },
      createdAt: now,
      images: [{ imageUrl: 'img1' }],
      content: '설명',
      timeTaken: '10분',
      price: 10000,
    };

    const result = mapper.toLatestContentsResponse(post, {
      tags: ['고양이'],
      likeCount: 3,
      profileImageUrl: 'profile1',
      drawingCount: 7,
      reviewStat: { reviewCount: 4, star: 4.5 },
    });

    expect(result.uploader.nickname).toBe('작가');
    expect(result.uploader.reviewCount).toBe(4);
    expect(result.contents.contentId).toBe(1);
    expect(result.contents.tags).toEqual(['고양이']);
    expect(result.contents.likeCount).toBe(3);
  });

  it('toMemberContentsDto는 기본값 처리 후 ContentsDto를 반환한다', () => {
    const now = new Date('2024-01-01T00:00:00.000Z');
    const post: any = {
      id: 2,
      createdAt: now,
      images: [{ imageUrl: 'img2' }],
      content: '멤버 글',
      timeTaken: null,
      price: null,
    };

    const result = mapper.toMemberContentsDto(post, {
      tags: [],
      likeCount: 0,
    });

    expect(result.contentId).toBe(2);
    expect(result.timeTaken).toBe('');
    expect(result.price).toBe(0);
  });
});
