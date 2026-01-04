import { ApiProperty } from '@nestjs/swagger';
import { LatestContentsResponse } from './latest-contents-response.dto';
import { PageResponseDto } from '../../common/dto/page-response.dto';

export class LatestContentsPageResponseDto extends PageResponseDto<LatestContentsResponse> {
  @ApiProperty({ type: [LatestContentsResponse] })
  data: LatestContentsResponse[];
}
