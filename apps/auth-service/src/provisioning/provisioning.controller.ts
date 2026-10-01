import { Body, Controller, Module, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import type { AuthRequest } from '../auth/session.guard';
import { ProvisioningSecurity } from './provisioning-security';
import { AccountProvisioningService } from './provisioning.service';
import { PrepareAccountDto, FinalizeAccountDto, ClaimCredentialDto } from './provisioning.dto';
@Controller('internal/provisioning')
@SkipThrottle()
@UseGuards(ProvisioningSecurity)
export class AccountProvisioningController {
  constructor(private readonly service: AccountProvisioningService) {}
  @Post(':id/prepare') prepare(@Param('id', ParseUUIDPipe) id: string, @Body() body: PrepareAccountDto, @Req() req: AuthRequest) { return this.service.prepare(id, body, req.requestId); }
  @Post(':id/finalize') finalize(@Param('id', ParseUUIDPipe) id: string, @Body() body: FinalizeAccountDto, @Req() req: AuthRequest) { return this.service.finalize(id, body, req.requestId); }
  @Post(':id/credentials') credentials(@Param('id', ParseUUIDPipe) id: string, @Body() body: ClaimCredentialDto, @Req() req: AuthRequest) { return this.service.claim(id, body, req.headers.authorization, req.requestId); }
}
@Module({ imports: [AuthModule], controllers: [AccountProvisioningController], providers: [ProvisioningSecurity, AccountProvisioningService] })
export class AccountProvisioningModule {}
