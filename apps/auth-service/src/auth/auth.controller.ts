import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import { AuthConfig } from '../config/auth.config';
import { AuthService } from './auth.service';
import { LoginDto, ChangePasswordDto, RefreshDto } from './auth.dto';
import {
  AllowRestrictedSession,
  SessionGuard,
  type AuthRequest,
} from './session.guard';

@ApiTags('Auth')
@AllowRestrictedSession()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AuthConfig,
  ) {}
  private cookieName(role: string) {
    return (
      (this.config.production ? '__Host-' : '') +
      'auth_refresh_' +
      (role === 'ADMIN_HRD' ? 'admin' : 'employee')
    );
  }
  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.production,
      sameSite: 'lax',
      path: this.config.production ? '/' : '/api/v1/auth',
    };
  }
  private origin(request: AuthRequest, required = false) {
    const origin = request.headers.origin;
    if (
      (required && !origin) ||
      (origin && !this.config.origins.includes(origin))
    )
      throw new ForbiddenException('Origin tidak diizinkan.');
  }
  private deliver(
    response: Response,
    result: Awaited<ReturnType<AuthService['login']>>,
  ) {
    response.cookie(this.cookieName(result.role), result.refreshToken, {
      ...this.cookieOptions(),
      expires: result.expiresAt,
    });
    response.setHeader('Cache-Control', 'no-store');
    return result.body;
  }
  @Post('admin/login')
  @HttpCode(200)
  async adminLogin(
    @Body() body: LoginDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.origin(request);
    return this.deliver(
      response,
      await this.auth.login(
        body.email,
        body.password,
        'ADMIN_HRD',
        request.requestId,
      ),
    );
  }
  @Post('employee/login')
  @HttpCode(200)
  async employeeLogin(
    @Body() body: LoginDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.origin(request);
    return this.deliver(
      response,
      await this.auth.login(
        body.email,
        body.password,
        'EMPLOYEE',
        request.requestId,
      ),
    );
  }
  // Services verify every request through /me (revocation-aware), so it cannot
  // share the 10/min login budget. It still requires a valid bearer session.
  @Get('me')
  @Throttle({ default: { limit: 600, ttl: 60000 } })
  @UseGuards(SessionGuard)
  @ApiBearerAuth()
  me(@Req() request: AuthRequest) {
    return this.auth.me(request.authSession!);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  @ApiBearerAuth()
  async logout(
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.origin(request);
    const result = await this.auth.logout(
      request.authSession!,
      request.requestId,
    );
    response.clearCookie(
      this.cookieName(request.authSession!.account.role),
      this.cookieOptions(),
    );
    return result;
  }
  @Post('change-password')
  @HttpCode(200)
  @UseGuards(SessionGuard)
  @ApiBearerAuth()
  async changePassword(
    @Body() body: ChangePasswordDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.origin(request);
    const result = await this.auth.changePassword(
      request.authSession!,
      body.currentPassword,
      body.newPassword,
      request.requestId,
    );
    response.clearCookie(
      this.cookieName(request.authSession!.account.role),
      this.cookieOptions(),
    );
    return result;
  }
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() body: RefreshDto,
    @Req() request: AuthRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.origin(request, true);
    const role = body.panel === 'admin' ? 'ADMIN_HRD' : 'EMPLOYEE';
    const token = request.cookies?.[this.cookieName(role)] as
      string | undefined;
    return this.deliver(
      response,
      await this.auth.refresh(token, role, request.requestId),
    );
  }
}
