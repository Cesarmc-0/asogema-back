jest.mock('@aws-sdk/client-s3');
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BadRequestException } from '@nestjs/common';
import { S3StorageService } from './s3-storage.service';

const send = jest.fn();

(S3Client as jest.Mock).mockImplementation(() => ({ send }));
(PutObjectCommand as unknown as jest.Mock).mockImplementation((input) => input);

function buildFile(overrides: Partial<Express.Multer.File> = {}) {
  return {
    originalname: 'foto.jpg',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('imagen-de-prueba'),
    size: 15,
    ...overrides,
  } as Express.Multer.File;
}

describe('S3StorageService', () => {
  let service: S3StorageService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_S3_BUCKET = 'asogema-test-bucket';
    process.env.AWS_ACCESS_KEY_ID = 'AKIA_TEST';
    process.env.AWS_SECRET_ACCESS_KEY = 'secret_test';
    delete process.env.AWS_S3_PUBLIC_BASE_URL;
    send.mockResolvedValue({});
    service = new S3StorageService();
  });

  afterEach(() => {
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_S3_PUBLIC_BASE_URL;
  });

  it('sube la imagen y devuelve la URL pública con la carpeta y extensión correctas', async () => {
    const result = await service.upload(buildFile(), 'salones');

    expect(send).toHaveBeenCalledTimes(1);
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'asogema-test-bucket',
        ContentType: 'image/jpeg',
        Body: expect.any(Buffer),
      }),
    );

    const commandInput = (PutObjectCommand as unknown as jest.Mock).mock
      .calls[0][0] as { Key: string };
    expect(commandInput.Key).toMatch(/^salones\/[0-9a-f-]{36}\.jpg$/);
    expect(result.key).toBe(commandInput.Key);
    expect(result.url).toBe(
      `https://asogema-test-bucket.s3.us-east-1.amazonaws.com/${commandInput.Key}`,
    );
  });

  it('usa AWS_S3_PUBLIC_BASE_URL cuando está definida', async () => {
    process.env.AWS_S3_PUBLIC_BASE_URL = 'https://cdn.asogema.com/';
    service = new S3StorageService();

    const result = await service.upload(buildFile({ mimetype: 'image/png' }));

    expect(result.url).toMatch(
      /^https:\/\/cdn\.asogema\.com\/general\/[0-9a-f-]{36}\.png$/,
    );
  });

  it('rechaza un tipo de archivo no permitido', async () => {
    await expect(
      service.upload(buildFile({ mimetype: 'application/pdf' })),
    ).rejects.toThrow(BadRequestException);
    expect(send).not.toHaveBeenCalled();
  });

  it('rechaza un archivo vacío', async () => {
    await expect(
      service.upload(buildFile({ buffer: Buffer.alloc(0) })),
    ).rejects.toThrow(BadRequestException);
    expect(send).not.toHaveBeenCalled();
  });
});
