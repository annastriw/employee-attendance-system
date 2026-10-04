import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import type { Response } from 'express';
import type { AttendanceRequest } from '../auth/admin.guard';
import { EmployeeGuard } from '../auth/employee.guard';
import { CheckInDto, CheckOutDto } from './checkin.dto';
import { CheckInService } from './checkin.service';
function key(value: string | undefined) {
  if (!value || !isUUID(value, '4'))
    throw new BadRequestException('Idempotency-Key UUID v4 wajib diisi.');
  return value.toLowerCase();
}
@ApiTags('My attendance')
@ApiBearerAuth()
@UseGuards(EmployeeGuard)
@Controller('me/attendance')
export class CheckInController {
  constructor(private readonly service: CheckInService) {}
  private noQuery(request: AttendanceRequest) {
    if (Object.keys(request.query).length)
      throw new BadRequestException('Query tidak diizinkan.');
  }
  @Get('today') today(@Req() req: AttendanceRequest) {
    this.noQuery(req);
    return this.service.today(req.actor!, req.requestId);
  }
  @Get('requests/:key') operation(
    @Param('key') operationKey: string,
    @Req() req: AttendanceRequest,
  ) {
    this.noQuery(req);
    return this.service.operation(key(operationKey), req.actor!, req.requestId);
  }
  @Post('check-in')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  async checkIn(
    @Headers('idempotency-key') operationKey: string | undefined,
    @Body() body: CheckInDto,
    @Req() req: AttendanceRequest,
    @Res() res: Response,
  ) {
    this.noQuery(req);
    const result = await this.service.checkIn(
      key(operationKey),
      body,
      req.actor!,
      req.headers.authorization!,
      req.requestId,
    );
    res.status(result.status).json(result.body);
  }
  @Post('check-out')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  async checkOut(
    @Headers('idempotency-key') operationKey: string | undefined,
    @Body() body: CheckOutDto,
    @Req() req: AttendanceRequest,
    @Res() res: Response,
  ) {
    this.noQuery(req);
    const result = await this.service.checkOut(
      key(operationKey),
      body,
      req.actor!,
      req.headers.authorization!,
      req.requestId,
    );
    res.status(result.status).json(result.body);
  }
}
