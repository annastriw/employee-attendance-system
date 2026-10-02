import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MESSAGE = 'Format tanggal harus YYYY-MM-DD.';

export class CreateHolidayDto {
  @IsString()
  @Matches(DATE_REGEX, { message: DATE_MESSAGE })
  holidayDate: string;

  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Keterangan tidak boleh kosong.' })
  @MaxLength(200, { message: 'Keterangan maksimal 200 karakter.' })
  description: string;
}

export class UpdateHolidayDto {
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: DATE_MESSAGE })
  holidayDate?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'Keterangan tidak boleh kosong.' })
  @MaxLength(200, { message: 'Keterangan maksimal 200 karakter.' })
  description?: string;
}

export class ListHolidaysQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: DATE_MESSAGE })
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE_REGEX, { message: DATE_MESSAGE })
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 50;
}
