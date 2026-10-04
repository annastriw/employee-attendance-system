import { MediaPurpose } from '@attendance/database';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
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

export class PhotoBindDto extends PhotoScopeDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') eventId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID('4') actorAccountId: string;
}

export class PhotoCleanupDto {
  @ApiProperty({
    required: false,
    description: 'Grace period in milliseconds before an unbound photo is eligible for cleanup',
    example: 7200000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodMs?: number;

  @ApiProperty({
    required: false,
    description: 'Maximum number of candidate orphan objects to clean up in this batch',
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
