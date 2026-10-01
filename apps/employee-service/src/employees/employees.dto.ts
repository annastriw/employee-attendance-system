import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateBy } from 'class-validator';
import { ListPositionsQuery } from '../positions/positions.dto';
const clean = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
export function validCalendarDate(value: unknown) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1900 && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value; }
export class CreateEmployeeDto {
  @Transform(args => { const value = clean(args); return typeof value === 'string' ? value.toUpperCase() : value; })
  @IsString() @Matches(/^[A-Z0-9][A-Z0-9._/-]{1,39}$/, { message: 'NIK harus 2–40 karakter huruf/angka atau . _ / -.' }) nik!: string;
  @Transform(clean) @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email!: string;
  @Transform(args => clean(args) || undefined) @IsOptional() @IsString() @Matches(/^\+?[0-9 ()-]{6,30}$/) phone?: string;
  @IsUUID() departmentId!: string;
  @IsUUID() positionId!: string;
  @ValidateBy({ name: 'calendarDate', validator: { validate: value => { try { return validCalendarDate(value); } catch { return false; } }, defaultMessage: () => 'Tanggal mulai bekerja harus tanggal kalender yang valid.' } }) startDate!: string;
  @IsIn(['ACTIVE', 'INACTIVE']) status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE';
}
export class ListEmployeesQuery extends ListPositionsQuery {}
export class CredentialRequestDto { @IsOptional() @IsIn([true, false]) recover?: boolean; }
