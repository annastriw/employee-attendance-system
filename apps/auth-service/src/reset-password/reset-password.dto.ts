import { IsUUID } from 'class-validator';

export class ResetEmployeePasswordDto {
  @IsUUID(undefined, { message: 'employeeId harus UUID.' })
  employeeId!: string;

  @IsUUID(undefined, { message: 'actorAccountId harus UUID.' })
  actorAccountId!: string;
}
