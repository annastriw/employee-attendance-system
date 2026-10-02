import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  Param,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import {
  SessionGuard,
  EmployeeGuard,
  InternalGuard,
  type MediaRequest,
} from '../auth/media.guard';
import { PhotosService } from './photos.service';
import { PhotoUploadDto, PhotoScopeDto, PhotoBindDto } from './photo.dto';
import { MAX_PHOTO_BYTES } from './photo-normalizer';

@ApiTags('Attendance photos')
@Controller('media/attendance-photos')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}
  @Post()
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['purpose', 'photo'],
      properties: {
        purpose: { enum: ['CHECK_IN', 'CHECK_OUT'], type: 'string' },
        photo: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseGuards(SessionGuard, EmployeeGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: {
        fileSize: MAX_PHOTO_BYTES,
        files: 1,
        fields: 1,
        parts: 2,
        fieldSize: 64,
      },
    }),
  )
  upload(
    @Req() request: MediaRequest,
    @Body() body: PhotoUploadDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const key = request.headers['idempotency-key'];
    if (
      typeof key !== 'string' ||
      !isUUID(key, '4') ||
      Object.keys(request.query).length
    )
      throw new BadRequestException(
        'Idempotency-Key UUID v4 wajib; query tidak diizinkan.',
      );
    return this.photos.upload(
      request.actor,
      body.purpose,
      key,
      file,
      request.requestId,
    );
  }
}

@ApiTags('Internal attendance photos')
@ApiHeader({ name: 'X-Media-Service-Key', required: true })
@UseGuards(InternalGuard)
@Controller('internal/media/attendance-photos')
export class InternalPhotosController {
  constructor(private readonly photos: PhotosService) {}
  @Post(':id/bind')
  bind(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: PhotoBindDto,
    @Req() request: MediaRequest,
  ) {
    return this.photos.bind(id, body, request.requestId);
  }

  @Post(':id/inspect')
  inspect(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() scope: PhotoScopeDto,
  ) {
    return this.photos.inspect(id, scope);
  }

  @Post(':id/photo-url')
  @ApiBearerAuth()
  @UseGuards(SessionGuard)
  url(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() scope: PhotoScopeDto,
    @Req() request: MediaRequest,
  ) {
    return this.photos.photoUrl(id, scope, request.actor, request.requestId);
  }
}
