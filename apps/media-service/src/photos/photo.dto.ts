import { MediaPurpose } from '@attendance/database';
import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PhotoUploadDto {
  @ApiProperty({ enum: MediaPurpose })
  @IsEnum(MediaPurpose)
  purpose: MediaPurpose;
}
export class PhotoScopeDto extends PhotoUploadDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  ownerEmployeeId: string;
}
