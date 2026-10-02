import { Body, Controller, HttpCode, Module, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import type { AuthRequest } from '../auth/session.guard';
import { ProvisioningSecurity } from '../provisioning/provisioning-security';
import { ChangeAccountLifecycleDto } from './lifecycle.dto';
import { AccountLifecycleService } from './lifecycle.service';

@Controller('internal/employee-lifecycle')
@SkipThrottle()
@UseGuards(ProvisioningSecurity)
export class AccountLifecycleController {
  constructor(private readonly service: AccountLifecycleService) {}
  @Post(':id') @HttpCode(200)
  change(@Param('id', ParseUUIDPipe) id: string, @Body() body: ChangeAccountLifecycleDto, @Req() req: AuthRequest) {
    return this.service.change(id, body, req.requestId);
  }
}

@Module({ imports: [AuthModule], controllers: [AccountLifecycleController], providers: [ProvisioningSecurity, AccountLifecycleService] })
export class AccountLifecycleModule {}
