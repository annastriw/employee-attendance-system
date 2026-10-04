import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.module';
import { TimePolicyEngine } from '../policy/time-policy.engine';
import type {
  CreateHolidayDto,
  ListHolidaysQuery,
  UpdateHolidayDto,
} from './holidays.dto';

export interface HolidayResponse {
  id: string;
  holidayDate: string;
  description: string;
  isPast: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class HolidaysService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Helper to format a Date or string to YYYY-MM-DD
   */
  private formatDate(date: Date | string): string {
    if (date instanceof Date) {
      return date.toISOString().slice(0, 10);
    }
    return String(date).slice(0, 10);
  }

  /**
   * Get today's date string in WIB (Asia/Jakarta = UTC+7)
   */
  getTodayWib(): string {
    return TimePolicyEngine.getWibComponents(new Date()).dateString;
  }

  async findAll(query: ListHolidaysQuery): Promise<{
    data: HolidayResponse[];
    meta: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    const todayWIB = this.getTodayWib();
    const where: Record<string, unknown> = {};

    // Date range or year/month filtering
    if (query.startDate || query.endDate) {
      where.holidayDate = {};
      if (query.startDate) {
        (where.holidayDate as Record<string, unknown>).gte = new Date(
          `${query.startDate}T00:00:00.000Z`,
        );
      }
      if (query.endDate) {
        (where.holidayDate as Record<string, unknown>).lte = new Date(
          `${query.endDate}T00:00:00.000Z`,
        );
      }
    } else if (query.year) {
      where.holidayDate = {};
      if (query.month) {
        const start = new Date(Date.UTC(query.year, query.month - 1, 1));
        const end = new Date(Date.UTC(query.year, query.month, 0));
        (where.holidayDate as Record<string, unknown>).gte = start;
        (where.holidayDate as Record<string, unknown>).lte = end;
      } else {
        const start = new Date(Date.UTC(query.year, 0, 1));
        const end = new Date(Date.UTC(query.year, 11, 31));
        (where.holidayDate as Record<string, unknown>).gte = start;
        (where.holidayDate as Record<string, unknown>).lte = end;
      }
    }

    if (query.search) {
      where.description = { contains: query.search };
    }

    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 50));
    const skip = (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      this.db.client.attHoliday.count({ where }),
      this.db.client.attHoliday.findMany({
        where,
        orderBy: { holidayDate: 'asc' },
        skip,
        take: pageSize,
      }),
    ]);

    const data: HolidayResponse[] = rows.map((r) => {
      const dateStr = this.formatDate(r.holidayDate);
      return {
        id: r.id,
        holidayDate: dateStr,
        description: r.description,
        isPast: dateStr < todayWIB,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async findById(id: string): Promise<HolidayResponse> {
    const holiday = await this.db.client.attHoliday.findUnique({
      where: { id },
    });

    if (!holiday) {
      throw new NotFoundException('Hari libur tidak ditemukan.');
    }

    const todayWIB = this.getTodayWib();
    const dateStr = this.formatDate(holiday.holidayDate);

    return {
      id: holiday.id,
      holidayDate: dateStr,
      description: holiday.description,
      isPast: dateStr < todayWIB,
      createdAt: holiday.createdAt.toISOString(),
      updatedAt: holiday.updatedAt.toISOString(),
    };
  }

  async create(
    dto: CreateHolidayDto,
    actorAccountId?: string,
    requestId?: string,
  ): Promise<HolidayResponse> {
    const todayWIB = this.getTodayWib();

    if (dto.holidayDate < todayWIB) {
      throw new BadRequestException('Tanggal libur tidak boleh berupa tanggal lampau.');
    }

    const targetDate = new Date(`${dto.holidayDate}T00:00:00.000Z`);

    const existing = await this.db.client.attHoliday.findUnique({
      where: { holidayDate: targetDate },
    });

    if (existing) {
      throw new ConflictException('Hari libur untuk tanggal tersebut sudah terdaftar.');
    }

    const trimmedDesc = dto.description.trim();

    const created = await this.db.client.$transaction(async (tx) => {
      const holiday = await tx.attHoliday.create({
        data: {
          holidayDate: targetDate,
          description: trimmedDesc,
        },
      });

      await tx.attAuditLog.create({
        data: {
          action: 'HOLIDAY_CREATED',
          entityType: 'HOLIDAY',
          entityId: holiday.id,
          actorAccountId: actorAccountId ?? null,
          details: {
            holidayDate: dto.holidayDate,
            description: trimmedDesc,
          },
          requestId: requestId ?? null,
        },
      });

      return holiday;
    });

    return {
      id: created.id,
      holidayDate: dto.holidayDate,
      description: created.description,
      isPast: false,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async update(
    id: string,
    dto: UpdateHolidayDto,
    actorAccountId?: string,
    requestId?: string,
  ): Promise<HolidayResponse> {
    const existing = await this.db.client.attHoliday.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Hari libur tidak ditemukan.');
    }

    const todayWIB = this.getTodayWib();
    const existingDateStr = this.formatDate(existing.holidayDate);

    if (existingDateStr < todayWIB) {
      throw new BadRequestException('Hari libur tanggal lampau tidak dapat diubah.');
    }

    let targetDate = existing.holidayDate;
    let newDateStr = existingDateStr;

    if (dto.holidayDate) {
      if (dto.holidayDate < todayWIB) {
        throw new BadRequestException('Tanggal libur tidak boleh berupa tanggal lampau.');
      }

      if (dto.holidayDate !== existingDateStr) {
        targetDate = new Date(`${dto.holidayDate}T00:00:00.000Z`);
        const conflict = await this.db.client.attHoliday.findFirst({
          where: {
            holidayDate: targetDate,
            id: { not: id },
          },
        });

        if (conflict) {
          throw new ConflictException('Hari libur untuk tanggal tersebut sudah terdaftar.');
        }
        newDateStr = dto.holidayDate;
      }
    }

    const newDescription =
      dto.description !== undefined ? dto.description.trim() : existing.description;

    const updated = await this.db.client.$transaction(async (tx) => {
      const holiday = await tx.attHoliday.update({
        where: { id },
        data: {
          holidayDate: targetDate,
          description: newDescription,
        },
      });

      await tx.attAuditLog.create({
        data: {
          action: 'HOLIDAY_UPDATED',
          entityType: 'HOLIDAY',
          entityId: id,
          actorAccountId: actorAccountId ?? null,
          details: {
            old: {
              holidayDate: existingDateStr,
              description: existing.description,
            },
            new: {
              holidayDate: newDateStr,
              description: newDescription,
            },
          },
          requestId: requestId ?? null,
        },
      });

      return holiday;
    });

    return {
      id: updated.id,
      holidayDate: newDateStr,
      description: updated.description,
      isPast: false,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async delete(
    id: string,
    actorAccountId?: string,
    requestId?: string,
  ): Promise<{ id: string; message: string }> {
    const existing = await this.db.client.attHoliday.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Hari libur tidak ditemukan.');
    }

    const todayWIB = this.getTodayWib();
    const existingDateStr = this.formatDate(existing.holidayDate);

    if (existingDateStr < todayWIB) {
      throw new BadRequestException('Hari libur tanggal lampau tidak dapat dihapus.');
    }

    await this.db.client.$transaction(async (tx) => {
      await tx.attHoliday.delete({
        where: { id },
      });

      await tx.attAuditLog.create({
        data: {
          action: 'HOLIDAY_DELETED',
          entityType: 'HOLIDAY',
          entityId: id,
          actorAccountId: actorAccountId ?? null,
          details: {
            holidayDate: existingDateStr,
            description: existing.description,
          },
          requestId: requestId ?? null,
        },
      });
    });

    return {
      id,
      message: 'Hari libur berhasil dihapus.',
    };
  }
}
