import {
  BadRequestException,
  Controller,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
  ForbiddenException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AuthProxyService } from './auth-proxy.service';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class MediaUploadGuard implements CanActivate {
  constructor(private readonly proxy: AuthProxyService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    const key = req.headers['idempotency-key'];
    if (
      req.originalUrl !== '/api/v1/media/attendance-photos' ||
      typeof key !== 'string' ||
      !UUID_V4.test(key)
    )
      throw new BadRequestException('Request upload tidak valid.');
    const authorization = req.headers.authorization;
    if (!authorization || !/^Bearer [^\s]+$/i.test(authorization))
      throw new UnauthorizedException('Sesi tidak valid.');
    const result = await this.proxy.forward('/api/v1/auth/me', 'GET', {
      authorization,
      'X-Request-ID': String(res.getHeader('X-Request-ID')),
    });
    if (result.status === 401)
      throw new UnauthorizedException('Sesi tidak valid.');
    if (result.status !== 200)
      throw new ServiceUnavailableException('Sesi belum dapat diverifikasi.');
    const actor = result.payload as {
      role?: string;
      mustChangePassword?: boolean;
      employeeId?: string;
    };
    if (
      actor.role !== 'EMPLOYEE' ||
      actor.mustChangePassword !== false ||
      typeof actor.employeeId !== 'string'
    )
      throw new ForbiddenException(
        'Upload hanya untuk karyawan yang siap menggunakan aplikasi.',
      );
    return true;
  }
}

@Controller('api/v1/media/attendance-photos')
export class MediaProxyController {
  constructor(private readonly proxy: AuthProxyService) {}
  @Post()
  @UseGuards(MediaUploadGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: {
        fileSize: 2 * 1024 * 1024,
        files: 1,
        fields: 1,
        parts: 2,
        fieldSize: 64,
      },
    }),
  )
  async upload(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFile() photo: Express.Multer.File,
  ) {
    const body = req.body as Record<string, unknown>;
    if (
      !photo ||
      photo.mimetype !== 'image/jpeg' ||
      !body ||
      Object.keys(body).length !== 1 ||
      (body.purpose !== 'CHECK_IN' && body.purpose !== 'CHECK_OUT')
    )
      throw new BadRequestException('Foto JPEG dan purpose wajib.');
    const multipart = new FormData();
    multipart.set('purpose', body.purpose);
    multipart.set(
      'photo',
      new Blob([new Uint8Array(photo.buffer)], { type: 'image/jpeg' }),
      'photo.jpg',
    );
    const result = await this.proxy.forwardMultipart(multipart, {
      authorization: req.headers.authorization!,
      'Idempotency-Key': req.headers['idempotency-key'] as string,
      'X-Request-ID': String(res.getHeader('X-Request-ID')),
    });
    res.status(result.status).json(result.payload);
  }
}
