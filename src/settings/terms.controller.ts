import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetUser } from '../common/decorators/get-user.decorator';
import { Member } from '../entities/member.entity';
import { CreateTermDto } from './dto/create-term.dto';
import { TermAdminQueryDto } from './dto/term-admin-query.dto';
import { TermResponseDto } from './dto/term-response.dto';
import { UpdateTermDto } from './dto/update-term.dto';
import { SettingsService } from './settings.service';

@ApiTags('Terms')
@Controller('terms')
export class TermsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('v1')
  @ApiOperation({ summary: '약관 목록 조회' })
  @ApiResponse({
    status: 200,
    description: '약관 목록 조회 성공',
    type: [TermResponseDto],
  })
  async getTerms(): Promise<TermResponseDto[]> {
    return this.settingsService.getTerms();
  }

  @Get('v1/admin')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '약관 목록 조회 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '약관 목록 조회 성공',
    type: [TermResponseDto],
  })
  async getTermsForAdmin(
    @GetUser() member: Member,
    @Query() query: TermAdminQueryDto,
  ): Promise<TermResponseDto[]> {
    return this.settingsService.getTermsForAdmin(member, query);
  }

  @Get('v1/admin/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '약관 상세 조회 (관리자)' })
  @ApiResponse({
    status: 200,
    description: '약관 상세 조회 성공',
    type: TermResponseDto,
  })
  async getTermForAdmin(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<TermResponseDto> {
    return this.settingsService.getTermForAdmin(member, +id);
  }

  @Post('v1')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '약관 등록 (관리자)' })
  @ApiBody({ type: CreateTermDto })
  @ApiResponse({
    status: 201,
    description: '약관 등록 성공',
    type: TermResponseDto,
  })
  async createTerm(
    @GetUser() member: Member,
    @Body() dto: CreateTermDto,
  ): Promise<TermResponseDto> {
    return this.settingsService.createTerm(member, dto);
  }

  @Patch('v1/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '약관 수정 (관리자)' })
  @ApiBody({ type: UpdateTermDto })
  @ApiResponse({
    status: 200,
    description: '약관 수정 성공',
    type: TermResponseDto,
  })
  async updateTerm(
    @GetUser() member: Member,
    @Param('id') id: string,
    @Body() dto: UpdateTermDto,
  ): Promise<TermResponseDto> {
    return this.settingsService.updateTerm(member, +id, dto);
  }

  @Delete('v1/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: '약관 삭제 (관리자)' })
  @ApiResponse({ status: 204, description: '약관 삭제 성공' })
  async removeTerm(
    @GetUser() member: Member,
    @Param('id') id: string,
  ): Promise<void> {
    return this.settingsService.removeTerm(member, +id);
  }
}
