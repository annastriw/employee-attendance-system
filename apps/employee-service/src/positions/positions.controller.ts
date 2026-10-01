import { Body, Controller, Get, HttpCode, Module, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard, AuthClient, type EmployeeRequest } from '../auth/admin.guard';
import { CreatePositionDto, ListPositionsQuery, UpdatePositionDto } from './positions.dto';
import { PositionsService } from './positions.service';

const uuid = new ParseUUIDPipe({ version: '4' });
const actor = (request: EmployeeRequest) => ({ accountId: request.actor!.id, requestId: request.requestId });

@ApiTags('Positions')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('positions')
export class PositionsController {
  constructor(private readonly positions: PositionsService) {}

  @Get()
  list(@Query() query: ListPositionsQuery) { return this.positions.list(query); }

  @Get(':id')
  get(@Param('id', uuid) id: string) { return this.positions.get(id); }

  @Post()
  create(@Body() body: CreatePositionDto, @Req() request: EmployeeRequest) {
    return this.positions.create(body, actor(request));
  }

  @Patch(':id')
  update(@Param('id', uuid) id: string, @Body() body: UpdatePositionDto, @Req() request: EmployeeRequest) {
    return this.positions.update(id, body, actor(request));
  }

  @Post(':id/activate') @HttpCode(200)
  activate(@Param('id', uuid) id: string, @Req() request: EmployeeRequest) {
    return this.positions.setStatus(id, 'ACTIVE', actor(request));
  }

  @Post(':id/deactivate') @HttpCode(200)
  deactivate(@Param('id', uuid) id: string, @Req() request: EmployeeRequest) {
    return this.positions.setStatus(id, 'INACTIVE', actor(request));
  }
}

@Module({ controllers: [PositionsController], providers: [PositionsService, AuthClient, AdminGuard] })
export class PositionsModule {}
