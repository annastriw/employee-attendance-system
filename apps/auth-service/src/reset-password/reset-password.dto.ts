import { IsUUID } from 'class-validator';

export class ResetEmployeePasswordDto {
  @IsUUID('4', { message: 'employeeId harus UUID v4.' })
  employeeId!: string;

  @IsUUID('4', { message: 'actorAccountId harus UUID v4.' })
  actorAccountId!: string;
}
