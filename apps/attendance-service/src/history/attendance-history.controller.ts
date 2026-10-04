import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmployeeGuard } from '../auth/employee.guard';
import type { AttendanceRequest } from '../auth/admin.guard';
import { AttendanceHistoryQuery } from './attendance-history.dto';
import { AttendanceHistoryService } from './attendance-history.service';
@ApiTags('My attendance history')
@ApiBearerAuth()
@UseGuards(EmployeeGuard)
@Controller('me/attendance')
export class AttendanceHistoryController {
  constructor(private readonly service: AttendanceHistoryService) {}
  private noQuery(req: AttendanceRequest) {
    if (Object.keys(req.query).length)
      throw new BadRequestException('Query tidak diizinkan.');
  }
  @Get() list(
    @Query() query: AttendanceHistoryQuery,
    @Req() req: AttendanceRequest,
  ) {
    return this.service.list(query, req.actor!, req.requestId);
  }
  @Get(':id') detail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AttendanceRequest,
  ) {
    this.noQuery(req);
    return this.service.detail(id, req.actor!, req.requestId);
  }
  @Get(':id/events/:eventId/photo') photo(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Req() req: AttendanceRequest,
  ) {
    this.noQuery(req);
    return this.service.photo(
      id,
      eventId,
      req.actor!,
      req.headers.authorization!,
      req.requestId,
    );
  }
}
