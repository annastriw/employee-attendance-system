import { Body, Controller, Get, Headers, HttpCode, Module, Param, ParseUUIDPipe, Post, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { AdminGuard, AuthClient, type EmployeeRequest } from '../auth/admin.guard';
import { CreateEmployeeDto, ListEmployeesQuery, CredentialRequestDto, RetryEmployeeDto } from './employees.dto';
import { EmployeesService } from './employees.service';
import { ProvisioningAuthClient } from './provisioning-auth.client';
const actor = (req: EmployeeRequest) => ({ accountId: req.actor!.id, requestId: req.requestId });
@Controller('employees') @UseGuards(AdminGuard)
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}
  @Get() list(@Query() query: ListEmployeesQuery) { return this.service.list(query); }
  @Post() create(@Headers('idempotency-key') key: string | undefined, @Body() body: CreateEmployeeDto, @Req() req: EmployeeRequest) {
    if (!key || !isUUID(key, '4')) throw new BadRequestException('Idempotency-Key UUID wajib diisi.');
    return this.service.create(key, body, actor(req));
  }
}
@Controller('employee-provisioning') @UseGuards(AdminGuard)
export class EmployeeProvisioningController {
  constructor(private readonly service: EmployeesService) {}
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string, @Req() req: EmployeeRequest) { return this.service.operation(id, actor(req)); }
  @Post(':id/retry') @HttpCode(200) retry(@Param('id', ParseUUIDPipe) id: string, @Body() body: RetryEmployeeDto, @Req() req: EmployeeRequest) { return this.service.retry(id, actor(req), body); }
  @Post(':id/credentials') @HttpCode(200) credentials(@Param('id', ParseUUIDPipe) id: string, @Body() body: CredentialRequestDto, @Req() req: EmployeeRequest) { return this.service.credentials(id, body, actor(req), req.headers.authorization); }
}
@Module({ controllers: [EmployeesController, EmployeeProvisioningController], providers: [EmployeesService, ProvisioningAuthClient, AuthClient, AdminGuard] })
export class EmployeesModule {}
