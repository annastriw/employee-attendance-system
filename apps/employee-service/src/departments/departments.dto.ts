import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const CODE = /^[A-Z0-9][A-Z0-9_-]*$/;
const CODE_MESSAGE = 'Kode hanya boleh huruf, angka, tanda hubung atau garis bawah.';

export class CreateDepartmentDto {
  @Transform(trim) @IsString() @MinLength(2, { message: 'Nama minimal 2 karakter.' })
  @MaxLength(120, { message: 'Nama maksimal 120 karakter.' })
  name: string;

  @Transform(upper) @IsString() @MinLength(2, { message: 'Kode minimal 2 karakter.' })
  @MaxLength(40, { message: 'Kode maksimal 40 karakter.' }) @Matches(CODE, { message: CODE_MESSAGE })
  code: string;
}

export class UpdateDepartmentDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2, { message: 'Nama minimal 2 karakter.' })
  @MaxLength(120, { message: 'Nama maksimal 120 karakter.' })
  name?: string;

  @IsOptional() @Transform(upper) @IsString() @MinLength(2, { message: 'Kode minimal 2 karakter.' })
  @MaxLength(40, { message: 'Kode maksimal 40 karakter.' }) @Matches(CODE, { message: CODE_MESSAGE })
  code?: string;
}

export class ListDepartmentsQuery {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] }) @IsOptional() @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize: number = 20;
}
