import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TermResponseDto } from './dto/term-response.dto';
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
}
