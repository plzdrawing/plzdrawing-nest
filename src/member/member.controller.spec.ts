import { Test, TestingModule } from '@nestjs/testing';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';

describe('MemberController', () => {
  let controller: MemberController;

  const mockMemberService = {
    // Add methods used in controller if needed, for now just empty object or minimal mocks
    uploadProfile: jest.fn(),
    updateProfile: jest.fn(),
    getMyProfile: jest.fn(),
    checkNickname: jest.fn(),
    withdraw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemberController],
      providers: [
        {
          provide: MemberService,
          useValue: mockMemberService,
        },
      ],
    }).compile();

    controller = module.get<MemberController>(MemberController);
  });

  it('정의되어 있어야 한다', () => {
    expect(controller).toBeDefined();
  });
});
