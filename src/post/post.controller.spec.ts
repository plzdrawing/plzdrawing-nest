import { Test, TestingModule } from '@nestjs/testing';
import { PostController } from './post.controller';
import { PostService } from './post.service';

describe('PostController', () => {
  let controller: PostController;

  const mockPostService = {
    create: jest.fn(),
    getLatestContents: jest.fn(),
    getMemberContents: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [
        {
          provide: PostService,
          useValue: mockPostService,
        },
      ],
    }).compile();

    controller = module.get<PostController>(PostController);
  });

  it('정의되어 있어야 한다', () => {
    expect(controller).toBeDefined();
  });

  it('create는 req.user/body/files를 서비스에 위임한다', async () => {
    mockPostService.create.mockResolvedValue({ id: 1 });
    const req = { user: { id: 10 } };
    const body = { content: 'hello' };
    const files = [{ originalname: 'a.png' }];

    await expect(
      controller.create(req as any, body as any, files as any),
    ).resolves.toEqual({ id: 1 });
    expect(mockPostService.create).toHaveBeenCalledWith(req.user, body, files);
  });

  it('getLatestContents는 paginationDto를 그대로 전달한다', async () => {
    const dto = { page: 1, limit: 10 };
    mockPostService.getLatestContents.mockResolvedValue({ data: [] });

    await expect(controller.getLatestContents(dto as any)).resolves.toEqual({
      data: [],
    });
    expect(mockPostService.getLatestContents).toHaveBeenCalledWith(dto);
  });

  it('getMemberContents는 memberId를 숫자로 변환해 전달한다', async () => {
    const dto = { page: 2, limit: 3 };
    mockPostService.getMemberContents.mockResolvedValue({ data: [] });

    await controller.getMemberContents('42', dto as any);

    expect(mockPostService.getMemberContents).toHaveBeenCalledWith(42, dto);
  });

  it('findOne은 id를 숫자로 변환해 전달한다', async () => {
    mockPostService.findOne.mockResolvedValue({ id: 5 });

    await controller.findOne('5');

    expect(mockPostService.findOne).toHaveBeenCalledWith(5);
  });

  it('update는 id를 숫자로 변환해 전달한다', async () => {
    mockPostService.update.mockResolvedValue({ id: 8 });
    const body = { content: 'updated' };

    await controller.update('8', body as any);

    expect(mockPostService.update).toHaveBeenCalledWith(8, body);
  });

  it('remove는 id를 숫자로 변환해 전달한다', async () => {
    mockPostService.remove.mockResolvedValue(undefined);

    await controller.remove('9');

    expect(mockPostService.remove).toHaveBeenCalledWith(9);
  });
});
