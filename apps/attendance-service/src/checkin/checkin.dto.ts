import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsUUID,
  IsIn,
  IsISO8601,
  Matches,
  ValidateNested,
  IsDefined,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { CheckInInput } from './checkin-policy';
const zone = /(Z|[+-][0-9]{2}:[0-9]{2})$/;
export class LocationDto {
  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude: number;
  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude: number;
  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(999999.99)
  accuracyMeters: number;
  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(zone)
  capturedAt: string;
}
export class CheckInDto implements CheckInInput {
  @ApiProperty({ format: 'uuid' }) @IsUUID() photoObjectId: string;
  @ApiProperty({ format: 'date-time' })
  @IsISO8601({ strict: true, strictSeparator: true })
  @Matches(zone)
  clientCapturedAt: string;
  @ApiProperty({ enum: ['AUTO', 'MANUAL'] })
  @IsIn(['AUTO', 'MANUAL'])
  captureMethod: 'AUTO' | 'MANUAL';
  @ApiProperty({ type: LocationDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  reason?: string;
}

export class CheckOutDto extends CheckInDto {
  @ApiProperty({ format: 'uuid', description: 'Owned daily record from today' })
  @IsUUID()
  dailyRecordId: string;
}
