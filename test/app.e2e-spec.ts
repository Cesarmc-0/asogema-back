import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ValidatedPipe } from 'src/common/pipes/validation.pipe';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidatedPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    BigInt.prototype.toJSON = function (this: bigint) {
      return this.toString();
    };
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ name: 'asogema-back', version: '0.0.1', status: 'ok' });
  });

  afterEach(async () => {
    await app.close();
  });
});
