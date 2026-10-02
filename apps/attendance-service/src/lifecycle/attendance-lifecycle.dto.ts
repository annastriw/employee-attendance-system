import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
export class AttendanceListDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'DELETED'], default: 'ACTIVE' })
  @IsOptional()
  @IsIn(['ACTIVE', 'DELETED'])
  status: 'ACTIVE' | 'DELETED' = 'ACTIVE';
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  startDate?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  endDate?: string;
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  employeeId?: string;
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  pageSize = 20;
}
export class AttendanceVersionDto {
  @ApiProperty({
    example: '2026-10-03T01:00:00.000Z',
    description: 'updatedAt versi detail yang dikonfirmasi',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  @IsISO8601({ strict: true })
  version!: string;
}
export class DeleteAttendanceDto extends AttendanceVersionDto {
  @ApiProperty({ maxLength: 500 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
