import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard, type AttendanceRequest } from '../auth/admin.guard';
import { AttendanceMonitoringService } from './attendance-monitoring.service';
import {
  MonitoringEmployeesQueryDto,
  MonitoringSummaryQueryDto,
} from './attendance-monitoring.dto';

@ApiTags('HRD monitoring')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('monitoring')
export class AttendanceMonitoringController {
  constructor(private readonly service: AttendanceMonitoringService) {}

  @Get('summary')
  summary(
    @Query() query: MonitoringSummaryQueryDto,
    @Req() req: AttendanceRequest,
  ) {
    return this.service.getSummary(query, req.requestId);
  }

  @Get('employees')
  employees(
    @Query() query: MonitoringEmployeesQueryDto,
    @Req() req: AttendanceRequest,
  ) {
    return this.service.getEmployees(query, req.requestId);
  }
}
