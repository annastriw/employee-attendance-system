import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthConfig } from '../config/auth.config';
import { AdminSeedService } from './admin-seed.service';
async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const config = app.get(AuthConfig);
    if (!config.seedEmail || !config.seedPassword) throw new Error('Configure local seed credentials first.');
    const result = await app.get(AdminSeedService).seed(config.seedEmail, config.seedPassword);
    console.log(result.created ? 'Admin HRD created; initial password change is required.' : 'Existing admin retained; password and status unchanged.');
  } finally { await app.close(); }
}
main().catch(() => { console.error('Admin seed failed. Check configuration and existing admin; credentials were not printed.'); process.exitCode = 1; });
