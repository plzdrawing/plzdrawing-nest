import { ApiProperty } from '@nestjs/swagger';
import { ContentsDto } from './contents.dto';
import { UploaderDto } from './uploader.dto';

export class LatestContentsResponse {
  @ApiProperty({ description: '업로더 정보', type: UploaderDto })
  uploader: UploaderDto;

  @ApiProperty({ description: '게시글 정보', type: ContentsDto })
  contents: ContentsDto;

  constructor(uploader: UploaderDto, contents: ContentsDto) {
    this.uploader = uploader;
    this.contents = contents;
  }
}
