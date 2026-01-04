import { ApiProperty } from '@nestjs/swagger';
import { ContentsDto } from './contents.dto';
import { PageResponseDto } from '../../common/dto/page-response.dto';

export class ContentsPageResponseDto extends PageResponseDto<ContentsDto> {
  @ApiProperty({ type: [ContentsDto] })
  data: ContentsDto[];
}
