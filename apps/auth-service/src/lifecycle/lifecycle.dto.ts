import { IsIn, IsUUID } from 'class-validator';

export const LIFECYCLE_TARGET = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export type LifecycleStatus = (typeof LIFECYCLE_TARGET)[number];

export class ChangeAccountLifecycleDto {
  @IsUUID() employeeId!: string;
  @IsUUID() actorAccountId!: string;
  @IsIn(LIFECYCLE_TARGET) expectedStatus!: LifecycleStatus;
  @IsIn(LIFECYCLE_TARGET) targetStatus!: LifecycleStatus;
}
