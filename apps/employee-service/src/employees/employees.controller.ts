import { Body, Controller, Get, Headers, HttpCode, Module, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { AdminGuard, AuthClient, type EmployeeRequest } from '../auth/admin.guard';
import { CreateEmployeeDto, ListEmployeesQuery, CredentialRequestDto, RetryEmployeeDto, UpdateEmployeeDto, ChangeEmailDto, ChangeLifecycleDto } from './employees.dto';
import { EmployeesService } from './employees.service';
import { EmployeeProfileService } from './employee-profile.service';
import { EmployeeEmailChangesService } from './email-changes.service';
import { EmployeeLifecycleService } from './lifecycle.service';
import { ProvisioningAuthClient } from './provisioning-auth.client';
const actor = (req: EmployeeRequest) => ({ accountId: req.actor!.id, requestId: req.requestId });
function operationKey(key?: string) {
  if (!key || !isUUID(key, '4')) throw new BadRequestException('Idempotency-Key UUID wajib diisi.');
  return key;
}
@Controller('employees') @UseGuards(AdminGuard)
export class EmployeesController {
  constructor(private readonly service: EmployeesService, private readonly profiles: EmployeeProfileService, private readonly emailChanges: EmployeeEmailChangesService, private readonly lifecycle: EmployeeLifecycleService) {}
  @Get() list(@Query() query: ListEmployeesQuery) { return this.service.list(query); }
  @Get(':id') detail(@Param('id', ParseUUIDPipe) id: string) { return this.profiles.detail(id); }
  @Get(':id/history') history(@Param('id', ParseUUIDPipe) id: string, @Query() query: ListEmployeesQuery) { return this.profiles.history(id, query); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() body: UpdateEmployeeDto, @Req() req: EmployeeRequest) { return this.profiles.update(id, body, actor(req)); }
  @Post(':id/email') @HttpCode(200)
  email(@Param('id', ParseUUIDPipe) id: string, @Headers('idempotency-key') key: string | undefined, @Body() body: ChangeEmailDto, @Req() req: EmployeeRequest) {
    return this.emailChanges.start(operationKey(key), id, body, actor(req));
  }
  @Post(':id/lifecycle') @HttpCode(200)
  lifecycleChange(@Param('id', ParseUUIDPipe) id: string, @Headers('idempotency-key') key: string | undefined, @Body() body: ChangeLifecycleDto, @Req() req: EmployeeRequest) {
    return this.lifecycle.start(operationKey(key), id, body, actor(req));
  }
  @Post() create(@Headers('idempotency-key') key: string | undefined, @Body() body: CreateEmployeeDto, @Req() req: EmployeeRequest) {
    return this.service.create(operationKey(key), body, actor(req));
  }
}
@Controller('employee-provisioning') @UseGuards(AdminGuard)
export class EmployeeProvisioningController {
  constructor(private readonly service: EmployeesService) {}
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string, @Req() req: EmployeeRequest) { return this.service.operation(id, actor(req)); }
  @Post(':id/retry') @HttpCode(200) retry(@Param('id', ParseUUIDPipe) id: string, @Body() body: RetryEmployeeDto, @Req() req: EmployeeRequest) { return this.service.retry(id, actor(req), body); }
  @Post(':id/credentials') @HttpCode(200) credentials(@Param('id', ParseUUIDPipe) id: string, @Body() body: CredentialRequestDto, @Req() req: EmployeeRequest) { return this.service.credentials(id, body, actor(req), req.headers.authorization); }
}
@Controller('employee-email-changes') @UseGuards(AdminGuard)
export class EmployeeEmailChangesController {
  constructor(private readonly service: EmployeeEmailChangesService) {}
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string, @Req() req: EmployeeRequest) { return this.service.operation(id, actor(req)); }
  @Post(':id/retry') @HttpCode(200) retry(@Param('id', ParseUUIDPipe) id: string, @Req() req: EmployeeRequest) { return this.service.retry(id, actor(req)); }
}
@Controller('employee-lifecycle') @UseGuards(AdminGuard)
export class EmployeeLifecycleController {
  constructor(private readonly service: EmployeeLifecycleService) {}
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string, @Req() req: EmployeeRequest) { return this.service.operation(id, actor(req)); }
  @Post(':id/retry') @HttpCode(200) retry(@Param('id', ParseUUIDPipe) id: string, @Req() req: EmployeeRequest) { return this.service.retry(id, actor(req)); }
}
@Module({ controllers: [EmployeesController, EmployeeProvisioningController, EmployeeEmailChangesController, EmployeeLifecycleController], providers: [EmployeesService, EmployeeProfileService, EmployeeEmailChangesService, EmployeeLifecycleService, ProvisioningAuthClient, AuthClient, AdminGuard] })
export class EmployeesModule {}