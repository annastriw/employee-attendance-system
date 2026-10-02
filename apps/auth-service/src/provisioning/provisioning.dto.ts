import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsOptional, IsUUID, MaxLength } from 'class-validator';
export class PrepareAccountDto {
  @IsUUID() employeeId!: string;
  @IsUUID() actorAccountId!: string;
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email!: string;
  @IsIn(['ACTIVE', 'INACTIVE']) status!: 'ACTIVE' | 'INACTIVE';
}
export class FinalizeAccountDto extends PrepareAccountDto {
  @IsIn([true]) profileReady!: true;
}
export class ClaimCredentialDto {
  @IsOptional() @IsBoolean() recover?: boolean;
}
