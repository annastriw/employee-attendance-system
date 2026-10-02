import {
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { timingSafeEqual } from 'node:crypto';
import { EmployeeConfig } from '../config/employee.config';
import { DatabaseService } from '../database/database.module';
import { NotFoundException } from '@nestjs/common';

@ApiTags('Internal attendance profile')
@ApiHeader({ name: 'X-Employee-Service-Key', required: true })
@Controller('internal/employees')
export class AttendanceProfileController {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: EmployeeConfig,
  ) {}
  @Get(':id/attendance-profile')
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('x-employee-service-key') supplied?: string,
  ) {
    const expected = Buffer.from(this.config.provisioningSecret);
    if (
      typeof supplied !== 'string' ||
      Buffer.byteLength(supplied) !== expected.length ||
      !timingSafeEqual(Buffer.from(supplied), expected)
    )
      throw new UnauthorizedException('Akses layanan tidak valid.');
    const row = await this.db.client.empEmployee.findUnique({
      where: { id },
      include: { department: true, position: true },
    });
    if (!row) throw new NotFoundException('Karyawan tidak ditemukan.');
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      ready: row.ready,
      startDate: row.startDate.toISOString().slice(0, 10),
      department: { id: row.department.id, name: row.department.name },
      position: { id: row.position.id, name: row.position.name },
    };
  }
}
