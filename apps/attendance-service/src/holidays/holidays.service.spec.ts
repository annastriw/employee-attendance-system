import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import type { DatabaseService } from '../database/database.module';

describe('HolidaysService (Unit)', () => {
  let service: HolidaysService;
  let mockDb: any;

  const TODAY_WIB = '2026-10-02';
  const TOMORROW_WIB = '2026-10-03';
  const YESTERDAY_WIB = '2026-10-01';

  beforeEach(() => {
    mockDb = {
      client: {
        attHoliday: {
          findMany: jest.fn(),
          count: jest.fn(),
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
        },
        attAuditLog: {
          create: jest.fn(),
        },
        $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => {
          return cb(mockDb.client);
        }),
      },
    };

    service = new HolidaysService(mockDb as unknown as DatabaseService);
    // Mock getTodayWib to ensure fixed deterministic date for tests
    jest.spyOn(service, 'getTodayWib').mockReturnValue(TODAY_WIB);
  });

  describe('create', () => {
    it('rejects creating a holiday with past date (400 Bad Request)', async () => {
      await expect(
        service.create({
          holidayDate: YESTERDAY_WIB,
          description: 'Libur Kemarin',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create({
          holidayDate: YESTERDAY_WIB,
          description: 'Libur Kemarin',
        }),
      ).rejects.toThrow('Tanggal libur tidak boleh berupa tanggal lampau.');
    });

    it('rejects duplicate holiday on existing date (409 Conflict)', async () => {
      mockDb.client.attHoliday.findUnique.mockResolvedValueOnce({
        id: 'existing-id',
        holidayDate: new Date(`${TOMORROW_WIB}T00:00:00.000Z`),
        description: 'Libur Sudah Ada',
      });

      await expect(
        service.create({
          holidayDate: TOMORROW_WIB,
          description: 'Libur Ganda',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('successfully creates today or future holiday and records audit log', async () => {
      mockDb.client.attHoliday.findUnique.mockResolvedValueOnce(null);
      mockDb.client.attHoliday.create.mockResolvedValueOnce({
        id: 'new-id',
        holidayDate: new Date(`${TODAY_WIB}T00:00:00.000Z`),
        description: 'Libur Hari Ini',
        createdAt: new Date('2026-10-02T08:00:00.000Z'),
        updatedAt: new Date('2026-10-02T08:00:00.000Z'),
      });

      const res = await service.create(
        {
          holidayDate: TODAY_WIB,
          description: '  Libur Hari Ini  ',
        },
        'admin-account-id',
        'req-123',
      );

      expect(res.id).toBe('new-id');
      expect(res.holidayDate).toBe(TODAY_WIB);
      expect(res.description).toBe('Libur Hari Ini');
      expect(res.isPast).toBe(false);

      expect(mockDb.client.attAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'HOLIDAY_CREATED',
          entityType: 'HOLIDAY',
          entityId: 'new-id',
          actorAccountId: 'admin-account-id',
          details: {
            holidayDate: TODAY_WIB,
            description: 'Libur Hari Ini',
          },
          requestId: 'req-123',
        }),
      });
    });
  });

  describe('findAll', () => {
    it('retrieves holidays with isPast calculated based on WIB today', async () => {
      mockDb.client.attHoliday.count.mockResolvedValueOnce(2);
      mockDb.client.attHoliday.findMany.mockResolvedValueOnce([
        {
          id: 'past-id',
          holidayDate: new Date(`${YESTERDAY_WIB}T00:00:00.000Z`),
          description: 'Libur Kemarin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'future-id',
          holidayDate: new Date(`${TOMORROW_WIB}T00:00:00.000Z`),
          description: 'Libur Besok',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await service.findAll({});

      expect(res.data).toHaveLength(2);
      expect(res.data[0].id).toBe('past-id');
      expect(res.data[0].isPast).toBe(true);
      expect(res.data[1].id).toBe('future-id');
      expect(res.data[1].isPast).toBe(false);
      expect(res.meta.total).toBe(2);
    });
  });

  describe('findById', () => {
    it('throws NotFoundException when ID does not exist', async () => {
      mockDb.client.attHoliday.findUnique.mockResolvedValueOnce(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('returns holiday with isPast flag', async () => {
      mockDb.client.attHoliday.findUnique.mockResolvedValueOnce({
        id: 'some-id',
        holidayDate: new Date(`${TOMORROW_WIB}T00:00:00.000Z`),
        description: 'Libur Masa Depan',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.findById('some-id');
      expect(res.id).toBe('some-id');
      expect(res.isPast).toBe(false);
    });
  });

  describe('update', () => {
    it('rejects modifying a past holiday (400 Bad Request)', async () => {
      mockDb.client.attHoliday.findUnique.mockResolvedValue({
        id: 'past-id',
        holidayDate: new Date(`${YESTERDAY_WIB}T00:00:00.000Z`),
        description: 'Libur Lampau',
      });

      await expect(
        service.update('past-id', { description: 'Ubah keterangan' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('past-id', { description: 'Ubah keterangan' }),
      ).rejects.toThrow('Hari libur tanggal lampau tidak dapat diubah.');
    });

    it('rejects updating holiday to a past date (400 Bad Request)', async () => {
      mockDb.client.attHoliday.findUnique.mockResolvedValue({
        id: 'today-id',
        holidayDate: new Date(`${TODAY_WIB}T00:00:00.000Z`),
        description: 'Libur Hari Ini',
      });

      await expect(
        service.update('today-id', { holidayDate: YESTERDAY_WIB }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('today-id', { holidayDate: YESTERDAY_WIB }),
      ).rejects.toThrow('Tanggal libur tidak boleh berupa tanggal lampau.');
    });

    it('rejects updating to a date that conflicts with another holiday (409 Conflict)', async () => {
      mockDb.client.attHoliday.findUnique.mockResolvedValueOnce({
        id: 'h1',
        holidayDate: new Date(`${TODAY_WIB}T00:00:00.000Z`),
        description: 'Libur H1',
      });
      mockDb.client.attHoliday.findFirst.mockResolvedValueOnce({
        id: 'h2',
        holidayDate: new Date(`${TOMORROW_WIB}T00:00:00.000Z`),
        description: 'Libur H2',
      });

      await expect(
        service.update('h1', { holidayDate: TOMORROW_WIB }),
      ).rejects.toThrow(ConflictException);
    });

    it('successfully updates a today or future holiday and records audit log', async () => {
      mockDb.client.attHoliday.findUnique.mockResolvedValueOnce({
        id: 'h1',
        holidayDate: new Date(`${TODAY_WIB}T00:00:00.000Z`),
        description: 'Libur Awal',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockDb.client.attHoliday.update.mockResolvedValueOnce({
        id: 'h1',
        holidayDate: new Date(`${TODAY_WIB}T00:00:00.000Z`),
        description: 'Libur Revisi',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await service.update(
        'h1',
        { description: 'Libur Revisi' },
        'admin-actor',
        'req-edit-1',
      );

      expect(res.description).toBe('Libur Revisi');
      expect(mockDb.client.attAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'HOLIDAY_UPDATED',
          entityType: 'HOLIDAY',
          entityId: 'h1',
          actorAccountId: 'admin-actor',
          details: {
            old: { holidayDate: TODAY_WIB, description: 'Libur Awal' },
            new: { holidayDate: TODAY_WIB, description: 'Libur Revisi' },
          },
          requestId: 'req-edit-1',
        }),
      });
    });
  });

  describe('delete', () => {
    it('rejects deleting a past holiday (400 Bad Request)', async () => {
      mockDb.client.attHoliday.findUnique.mockResolvedValue({
        id: 'past-id',
        holidayDate: new Date(`${YESTERDAY_WIB}T00:00:00.000Z`),
        description: 'Libur Lampau',
      });

      await expect(service.delete('past-id')).rejects.toThrow(BadRequestException);
      await expect(service.delete('past-id')).rejects.toThrow(
        'Hari libur tanggal lampau tidak dapat dihapus.',
      );
    });

    it('successfully deletes a today or future holiday and records audit log', async () => {
      mockDb.client.attHoliday.findUnique.mockResolvedValueOnce({
        id: 'future-id',
        holidayDate: new Date(`${TOMORROW_WIB}T00:00:00.000Z`),
        description: 'Libur Masa Depan',
      });

      const res = await service.delete('future-id', 'admin-actor', 'req-del-1');

      expect(res.id).toBe('future-id');
      expect(res.message).toBe('Hari libur berhasil dihapus.');
      expect(mockDb.client.attHoliday.delete).toHaveBeenCalledWith({
        where: { id: 'future-id' },
      });
      expect(mockDb.client.attAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'HOLIDAY_DELETED',
          entityType: 'HOLIDAY',
          entityId: 'future-id',
          actorAccountId: 'admin-actor',
          details: {
            holidayDate: TOMORROW_WIB,
            description: 'Libur Masa Depan',
          },
          requestId: 'req-del-1',
        }),
      });
    });
  });
});
