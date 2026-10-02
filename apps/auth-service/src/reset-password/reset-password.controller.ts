import { Body, Controller, HttpCode, Module, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import type { AuthRequest } from '../auth/session.guard';
import { ProvisioningSecurity } from '../provisioning/provisioning-security';
import { ResetEmployeePasswordDto } from './reset-password.dto';
import { AccountResetPasswordService } from './reset-password.service';

@Controller('internal/employee-reset-password')
@SkipThrottle()
@UseGuards(ProvisioningSecurity)
export class AccountResetPasswordController {
  constructor(private readonly service: AccountResetPasswordService) {}

  @Post(':id')
  @HttpCode(200)
  reset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ResetEmployeePasswordDto,
    @Req() req: AuthRequest,
  ) {
    return this.service.reset(id, body, req.requestId);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [AccountResetPasswordController],
  providers: [ProvisioningSecurity, AccountResetPasswordService],
})
export class AccountResetPasswordModule {}
