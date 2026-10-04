import { Transform } from 'class-transformer';
import { IsEmail, IsUUID, MaxLength } from 'class-validator';
const normalize = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value;
export class ChangeEmployeeEmailDto {
  @IsUUID() employeeId!: string;
  @IsUUID() actorAccountId!: string;
  @Transform(normalize) @IsEmail() @MaxLength(254) expectedEmail!: string;
  @Transform(normalize) @IsEmail() @MaxLength(254) email!: string;
}