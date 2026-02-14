import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { MemberService } from './member.service';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';
import { UpsertProfileDto } from './dto/upsert-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileInfoResponse } from './dto/profile-info-response.dto';

@ApiTags('Member')
@Controller('member')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '프로필 업로드',
    description:
      '프로필 정보를 업로드합니다. file은 선택이며 업로드 시 파일 최대 크기는 5MB입니다.',
  })
  @ApiResponse({
    status: 201,
    description: '프로필 업로드 성공',
    type: Boolean,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (유효성 검사 실패 등)',
  })
  @ApiResponse({ status: 413, description: '파일 크기 초과 (최대 5MB)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          description: '프로필 이미지 파일(선택), 최대 5MB',
          type: 'string',
          format: 'binary',
        },
        introduce: {
          type: 'string',
        },
        hashTag: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
  })
  async uploadProfile(
    @GetUser() member: Member,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpsertProfileDto,
  ): Promise<boolean> {
    return this.memberService.uploadProfile(member.id, file, dto);
  }

  @Patch('v1/profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: '프로필 수정',
    description:
      '프로필 정보를 수정합니다. file은 선택이며 업로드 시 파일 최대 크기는 5MB입니다.',
  })
  @ApiResponse({ status: 200, description: '프로필 수정 성공', type: Boolean })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (유효성 검사 실패 등)',
  })
  @ApiResponse({ status: 413, description: '파일 크기 초과 (최대 5MB)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          description: '프로필 이미지 파일(선택), 최대 5MB',
          type: 'string',
          format: 'binary',
        },
        nickname: {
          type: 'string',
        },
        introduce: {
          type: 'string',
        },
        hashTag: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
  })
  async updateProfile(
    @GetUser() member: Member,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UpdateProfileDto,
  ): Promise<boolean> {
    return this.memberService.updateProfile(member.id, file, dto);
  }

  @Get('v1/me')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '내 프로필 조회' })
  @ApiResponse({
    status: 200,
    description: '프로필 조회 성공',
    type: ProfileInfoResponse,
  })
  async getMyProfile(@GetUser() member: Member): Promise<ProfileInfoResponse> {
    return this.memberService.getMyProfile(member.id);
  }

  @Get('check-nickname')
  @ApiOperation({ summary: '닉네임 중복 확인' })
  @ApiResponse({
    status: 200,
    description: '닉네임 사용 가능 여부',
    type: Boolean,
  })
  @ApiResponse({ status: 400, description: '잘못된 요청 (닉네임 미입력 등)' })
  async checkNickname(@Query('nickname') nickname: string): Promise<boolean> {
    return this.memberService.checkNickname(nickname);
  }

  @Delete('v1/withdraw')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '회원 탈퇴' })
  @ApiResponse({ status: 204, description: '회원 탈퇴 성공' })
  async withdraw(@GetUser() member: Member): Promise<void> {
    return this.memberService.withdraw(member.id);
  }
}
