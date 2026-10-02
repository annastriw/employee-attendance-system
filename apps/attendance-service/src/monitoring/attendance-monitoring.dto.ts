import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class MonitoringSummaryQueryDto {
  @ApiPropertyOptional({ format: 'date', example: '2026-10-03' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  date?: string;
}

export const MONITORING_STATUSES = [
  'ALL',
  'CHECKED_IN',
  'LATE',
  'EARLY_DEPARTURE',
  'PENDING_CHECKOUT',
  'COMPLETED',
  'MISSING',
  'PENDING_CHECK_IN',
  'DELETED',
] as const;

export type MonitoringFilterStatus = (typeof MONITORING_STATUSES)[number];

export class MonitoringEmployeesQueryDto {
  @ApiPropertyOptional({ format: 'date', example: '2026-10-03' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsISO8601({ strict: true })
  date?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('4')
  departmentId?: string;

  @ApiPropertyOptional({ enum: MONITORING_STATUSES, default: 'ALL' })
  @IsOptional()
  @IsIn(MONITORING_STATUSES)
  status: MonitoringFilterStatus = 'ALL';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
