import sharp from 'sharp';
import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { normalizePhoto, MAX_PHOTO_BYTES, sha256 } from './photo-normalizer';

const jpeg = (width = 640, height = 480) =>
  sharp({ create: { width, height, channels: 3, background: 'white' } })
    .jpeg()
    .toBuffer();
describe('Photo normalization', () => {
  it('decodes, removes EXIF, resizes and hashes the stored bytes', async () => {
    const bytes = await sharp(await jpeg(1600, 1200))
      .withExif({ IFD0: { Artist: 'private test metadata' } })
      .jpeg()
      .toBuffer();
    const result = await normalizePhoto({
      buffer: bytes,
      mimetype: 'image/jpeg',
    });
    expect(result.width).toBe(1280);
    expect(result.height).toBe(960);
    expect(result.checksumSha256).toBe(sha256(result.bytes));
    expect(result.byteSize).toBe(result.bytes.length);
    expect((await sharp(result.bytes).metadata()).exif).toBeUndefined();
  });
  it('rejects missing photos', async () => {
    await expect(normalizePhoto()).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects oversized payloads before decoding', async () => {
    await expect(
      normalizePhoto({
        buffer: Buffer.alloc(MAX_PHOTO_BYTES + 1),
        mimetype: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
  it('rejects spoofed MIME and JPEG magic without decoded pixels', async () => {
    await expect(
      normalizePhoto({ buffer: await jpeg(), mimetype: 'image/png' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      normalizePhoto({
        buffer: Buffer.from([255, 216, 255, 0]),
        mimetype: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects truncation and dimensions outside bounds', async () => {
    await expect(
      normalizePhoto({
        buffer: (await jpeg()).subarray(0, 300),
        mimetype: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      normalizePhoto({ buffer: await jpeg(159, 300), mimetype: 'image/jpeg' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      normalizePhoto({
        buffer: await jpeg(2500, 2000),
        mimetype: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
