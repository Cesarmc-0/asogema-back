import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ErrorCodes } from 'src/common/errors';

export interface FieldError {
  field: string;
  message: string;
}

const PRIMITIVES = [String, Boolean, Number, Array, Object];

@Injectable()
export class ValidatedPipe implements PipeTransform {
  async transform(value: unknown, metadata: ArgumentMetadata) {
    const { metatype } = metadata;
    if (!metatype || (PRIMITIVES as unknown[]).includes(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value) as object;
    const errors: ValidationError[] = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Los datos enviados no son válidos',
        details: errors.flatMap((error) => this.flatten(error)),
      });
    }

    return object;
  }

  private flatten(error: ValidationError): FieldError[] {
    const constraints = error.constraints ?? {};
    const messages = Object.values(constraints);

    if (messages.length > 0) {
      return [{ field: error.property, message: messages[0] }];
    }

    if (error.children && error.children.length > 0) {
      return error.children.flatMap((child) => this.flatten(child));
    }

    return [];
  }
}
