import { Body, Controller, HttpCode, Module, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import type { AuthRequest } from '../auth/session.guard';
import { ProvisioningSecurity } from '../provisioning/provisioning-security';
import { ChangeEmployeeEmailDto } from './email-changes.dto';
import { AccountEmailChangesService } from './email-changes.service';

@Controller('internal/employee-email-changes')
@SkipThrottle()
@UseGuards(ProvisioningSecurity)
export class AccountEmailChangesController {
  constructor(private readonly service: AccountEmailChangesService) {}
  @Post(':id') @HttpCode(200)
  change(@Param('id', ParseUUIDPipe) id: string, @Body() body: ChangeEmployeeEmailDto, @Req() req: AuthRequest) {
    return this.service.change(id, body, req.requestId);
  }
}
@Module({ imports: [AuthModule], controllers: [AccountEmailChangesController], providers: [ProvisioningSecurity, AccountEmailChangesService] })
export class AccountEmailChangesModule {}