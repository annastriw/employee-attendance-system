import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard, type AttendanceRequest } from '../auth/admin.guard';
import {
  CreateHolidayDto,
  ListHolidaysQuery,
  UpdateHolidayDto,
} from './holidays.dto';
import { HolidaysService } from './holidays.service';

@ApiTags('Holidays')
@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get()
  async findAll(@Query() query: ListHolidaysQuery) {
    return this.holidaysService.findAll(query);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.holidaysService.findById(id);
    return { data };
  }

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateHolidayDto,
    @Req() req: AttendanceRequest,
  ) {
    const data = await this.holidaysService.create(
      dto,
      req.actor?.id,
      req.requestId,
    );
    return { data };
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHolidayDto,
    @Req() req: AttendanceRequest,
  ) {
    const data = await this.holidaysService.update(
      id,
      dto,
      req.actor?.id,
      req.requestId,
    );
    return { data };
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  async delete(
    @Param('id') id: string,
    @Req() req: AttendanceRequest,
  ) {
    const data = await this.holidaysService.delete(
      id,
      req.actor?.id,
      req.requestId,
    );
    return { data };
  }
}
