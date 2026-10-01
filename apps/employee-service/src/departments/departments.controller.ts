import { Body, Controller, Get, HttpCode, Module, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard, AuthClient, type EmployeeRequest } from '../auth/admin.guard';
import { CreateDepartmentDto, ListDepartmentsQuery, UpdateDepartmentDto } from './departments.dto';
import { DepartmentsService } from './departments.service';

const uuid = new ParseUUIDPipe({ version: '4' });
const actor = (request: EmployeeRequest) => ({ accountId: request.actor!.id, requestId: request.requestId });

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  list(@Query() query: ListDepartmentsQuery) { return this.departments.list(query); }

  @Get(':id')
  get(@Param('id', uuid) id: string) { return this.departments.get(id); }

  @Post()
  create(@Body() body: CreateDepartmentDto, @Req() request: EmployeeRequest) {
    return this.departments.create(body, actor(request));
  }

  @Patch(':id')
  update(@Param('id', uuid) id: string, @Body() body: UpdateDepartmentDto, @Req() request: EmployeeRequest) {
    return this.departments.update(id, body, actor(request));
  }

  @Post(':id/activate') @HttpCode(200)
  activate(@Param('id', uuid) id: string, @Req() request: EmployeeRequest) {
    return this.departments.setStatus(id, 'ACTIVE', actor(request));
  }

  @Post(':id/deactivate') @HttpCode(200)
  deactivate(@Param('id', uuid) id: string, @Req() request: EmployeeRequest) {
    return this.departments.setStatus(id, 'INACTIVE', actor(request));
  }
}

@Module({ controllers: [DepartmentsController], providers: [DepartmentsService, AuthClient, AdminGuard] })
export class DepartmentsModule {}
