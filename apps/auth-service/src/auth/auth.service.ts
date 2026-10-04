import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';
import { isUUID } from 'class-validator';
import { Prisma, type AuthAccount, type AuthRole } from '@attendance/database';
import { DatabaseService } from '../database/database.service';

const TOKEN_TTL = 15 * 60;
const REFRESH_TTL = 7 * 24 * 60 * 60 * 1000;
const tokenHash = (value: string) =>
  createHash('sha256').update(value).digest('hex');
const invalidCredentials = () =>
  new UnauthorizedException('Email atau password tidak valid.');
const invalidSession = () =>
  new UnauthorizedException('Sesi tidak valid. Silakan login kembali.');
const profile = (account: AuthAccount) => ({
  id: account.id,
  employeeId: account.employeeId,
  email: account.email,
  role: account.role,
  mustChangePassword: account.mustChangePassword,
});
export type CurrentSession = Prisma.AuthSessionGetPayload<{
  include: { account: true };
}>;

@Injectable()
export class AuthService {
  private readonly dummyHash = hashSync(randomBytes(24).toString('hex'), 12);
  constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  private async lockAccount(tx: Prisma.TransactionClient, accountId: string) {
    await tx.$queryRaw`SELECT id FROM auth_accounts WHERE id = ${accountId} FOR UPDATE`;
  }
  private audit(
    tx: Prisma.TransactionClient,
    accountId: string | undefined,
    action: string,
    requestId?: string,
  ) {
    return tx.authAuditLog.create({
      data: {
        targetAccountId: accountId,
        actorAccountId: action === 'LOGIN_FAILED' ? undefined : accountId,
        action,
        requestId,
      },
    });
  }
  private validSession(session: CurrentSession | null) {
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.account.status !== 'ACTIVE'
    )
      throw invalidSession();
    return session;
  }
  private async response(
    account: AuthAccount,
    sessionId: string,
    refreshToken: string,
    expiresAt: Date,
  ) {
    const accessToken = await this.jwt.signAsync({
      sub: account.id,
      sid: sessionId,
    });
    return {
      body: { accessToken, expiresIn: TOKEN_TTL, user: profile(account) },
      refreshToken,
      role: account.role,
      expiresAt,
    };
  }
  async login(
    email: string,
    password: string,
    role: AuthRole,
    requestId?: string,
  ) {
    if (Buffer.byteLength(password) > 72)
      throw new BadRequestException('Password melebihi batas 72 byte.');
    const account = await this.database.client.authAccount.findUnique({
      where: { email },
    });
    const matches = await compare(
      password,
      account?.passwordHash ?? this.dummyHash,
    );
    if (
      !account ||
      !matches ||
      account.role !== role ||
      account.status !== 'ACTIVE'
    ) {
      await this.audit(
        this.database.client,
        account?.id,
        'LOGIN_FAILED',
        requestId,
      );
      throw invalidCredentials();
    }
    const refreshToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + REFRESH_TTL);
    const result = await this.database.client.$transaction(async (tx) => {
      await this.lockAccount(tx, account.id);
      const current = await tx.authAccount.findUnique({
        where: { id: account.id },
      });
      if (
        !current ||
        current.status !== 'ACTIVE' ||
        current.role !== role ||
        current.passwordHash !== account.passwordHash
      )
        throw invalidCredentials();
      const session = await tx.authSession.create({
        data: {
          accountId: current.id,
          refreshTokenHash: tokenHash(refreshToken),
          expiresAt,
        },
      });
      await this.audit(tx, current.id, 'LOGIN_SUCCEEDED', requestId);
      return { account: current, session };
    });
    return this.response(
      result.account,
      result.session.id,
      refreshToken,
      expiresAt,
    );
  }
  async authenticate(token: string, allowRestricted: boolean) {
    let claims: { sub: string; sid: string };
    try {
      claims = await this.jwt.verifyAsync(token, {
        algorithms: ['HS256'],
        issuer: 'attendance-auth',
        audience: 'attendance-platform',
      });
      if (!isUUID(claims.sub) || !isUUID(claims.sid)) throw invalidSession();
    } catch {
      throw invalidSession();
    }
    const session = this.validSession(
      await this.database.client.authSession.findUnique({
        where: { id: claims.sid },
        include: { account: true },
      }),
    );
    if (session.accountId !== claims.sub) throw invalidSession();
    if (!allowRestricted && session.account.mustChangePassword)
      throw new ForbiddenException(
        'Ganti password awal sebelum mengakses fitur aplikasi.',
      );
    return session;
  }
  me(session: CurrentSession) {
    return profile(session.account);
  }

  async logout(session: CurrentSession, requestId?: string) {
    await this.database.client.$transaction(async (tx) => {
      await this.lockAccount(tx, session.accountId);
      const result = await tx.authSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (result.count)
        await this.audit(tx, session.accountId, 'LOGOUT', requestId);
    });
    return { message: 'Logout berhasil.' };
  }
  async changePassword(
    session: CurrentSession,
    currentPassword: string,
    newPassword: string,
    requestId?: string,
  ) {
    if (
      Buffer.byteLength(currentPassword) > 72 ||
      Buffer.byteLength(newPassword) > 72
    )
      throw new BadRequestException('Password melebihi batas 72 byte.');
    if (newPassword === currentPassword)
      throw new BadRequestException('Password baru harus berbeda.');
    const newHash = await hash(newPassword, 12);
    await this.database.client.$transaction(async (tx) => {
      await this.lockAccount(tx, session.accountId);
      const current = this.validSession(
        await tx.authSession.findUnique({
          where: { id: session.id },
          include: { account: true },
        }),
      );
      if (!(await compare(currentPassword, current.account.passwordHash)))
        throw invalidCredentials();
      await tx.authAccount.update({
        where: { id: current.accountId },
        data: {
          passwordHash: newHash,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
        },
      });
      await tx.authSession.updateMany({
        where: { accountId: current.accountId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.audit(tx, current.accountId, 'PASSWORD_CHANGED', requestId);
    });
    return { message: 'Password diperbarui. Silakan login kembali.' };
  }
  async refresh(
    refreshToken: string | undefined,
    role: AuthRole,
    requestId?: string,
  ) {
    if (!refreshToken || !/^[A-Za-z0-9_-]{43}$/.test(refreshToken))
      throw invalidSession();
    const oldHash = tokenHash(refreshToken);
    const found = await this.database.client.authSession.findUnique({
      where: { refreshTokenHash: oldHash },
    });
    if (!found) throw invalidSession();
    const nextToken = randomBytes(32).toString('base64url');
    const result = await this.database.client.$transaction(async (tx) => {
      await this.lockAccount(tx, found.accountId);
      const current = this.validSession(
        await tx.authSession.findUnique({
          where: { id: found.id },
          include: { account: true },
        }),
      );
      if (current.refreshTokenHash !== oldHash || current.account.role !== role)
        throw invalidSession();
      const update = await tx.authSession.updateMany({
        where: { id: current.id, refreshTokenHash: oldHash, revokedAt: null },
        data: { refreshTokenHash: tokenHash(nextToken) },
      });
      if (update.count !== 1) throw invalidSession();
      await this.audit(tx, current.accountId, 'SESSION_REFRESHED', requestId);
      return current;
    });
    return this.response(
      result.account,
      result.id,
      nextToken,
      result.expiresAt,
    );
  }
}
