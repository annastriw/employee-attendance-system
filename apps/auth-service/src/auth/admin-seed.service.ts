import { ConflictException, Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { isEmail } from 'class-validator';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AdminSeedService {
  constructor(private readonly database: DatabaseService) {}
  async seed(email: string, password: string) {
    email = email.trim().toLowerCase();
    const size = Buffer.byteLength(password);
    if (!isEmail(email) || size < 12 || size > 72) throw new Error('Seed requires a valid email and password of 12–72 bytes.');
    return this.database.client.$transaction(async (tx) => {
      const existing = await tx.authAccount.findFirst({ where: { role: 'ADMIN_HRD' } });
      if (existing) {
        if (existing.email !== email) throw new ConflictException('An admin already exists. Seed cannot create a second admin.');
        return { created: false, id: existing.id };
      }
      const account = await tx.authAccount.create({ data: {
        email, passwordHash: await hash(password, 12),
        role: 'ADMIN_HRD', status: 'ACTIVE', mustChangePassword: true,
      } });
      await tx.authAuditLog.create({ data: { actorAccountId: account.id, targetAccountId: account.id, action: 'ADMIN_SEEDED' } });
      return { created: true, id: account.id };
    }, { isolationLevel: 'Serializable' });
  }
}
