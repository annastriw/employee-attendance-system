import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard, type AttendanceRequest } from '../auth/admin.guard';
import { AttendanceLifecycleService } from './attendance-lifecycle.service';
import {
  AttendanceListDto,
  AttendanceVersionDto,
  DeleteAttendanceDto,
} from './attendance-lifecycle.dto';
@ApiTags('HRD attendance')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('attendance')
export class AttendanceLifecycleController {
  constructor(private readonly service: AttendanceLifecycleService) {}
  private noQuery(req: AttendanceRequest) {
    if (Object.keys(req.query).length)
      throw new BadRequestException('Query tidak diizinkan.');
  }
  @Get() list(
    @Query() query: AttendanceListDto,
    @Req() req: AttendanceRequest,
  ) {
    return this.service.list(query, req.requestId);
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
  @Get(':id') detail(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AttendanceRequest,
  ) {
    this.noQuery(req);
    return this.service.detail(id, req.requestId);
  }
  @Delete(':id') delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: DeleteAttendanceDto,
    @Req() req: AttendanceRequest,
  ) {
    this.noQuery(req);
    return this.service.change(
      id,
      body.version,
      body.reason,
      req.actor!,
      req.headers.authorization!,
      req.requestId,
    );
  }
  @Post(':id/restore')
  @HttpCode(200)
  restore(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AttendanceVersionDto,
    @Req() req: AttendanceRequest,
  ) {
    this.noQuery(req);
    return this.service.change(
      id,
      body.version,
      undefined,
      req.actor!,
      req.headers.authorization!,
      req.requestId,
    );
  }
}
