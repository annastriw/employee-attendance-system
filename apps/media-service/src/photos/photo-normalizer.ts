import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const sha256 = (value: Buffer) =>
  createHash('sha256').update(value).digest('hex');

export async function normalizePhoto(
  file?: Pick<Express.Multer.File, 'buffer' | 'mimetype'>,
) {
  if (!file?.buffer.length)
    throw new BadRequestException('Foto wajib diunggah.');
  if (file.buffer.length > MAX_PHOTO_BYTES)
    throw new PayloadTooLargeException('Foto maksimum 2 MiB.');
  if (
    file.mimetype !== 'image/jpeg' ||
    !file.buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  ) {
    throw new BadRequestException('Foto harus JPEG yang valid.');
  }
  try {
    const image = sharp(file.buffer, {
      failOn: 'warning',
      limitInputPixels: 4_000_000,
    });
    const metadata = await image.metadata();
    if (
      metadata.format !== 'jpeg' ||
      !metadata.width ||
      !metadata.height ||
      metadata.width < 160 ||
      metadata.height < 160
    ) {
      throw new Error('Invalid image dimensions');
    }
    const { data, info } = await image
      .rotate()
      .resize({
        width: 1280,
        height: 1280,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    return {
      bytes: data,
      checksumSha256: sha256(data),
      byteSize: data.length,
      width: info.width,
      height: info.height,
    };
  } catch {
    throw new BadRequestException('Foto rusak atau dimensi tidak valid.');
  }
}
