import { Injectable } from '@nestjs/common';
import { ReviewRepository } from 'src/reviews/domain/repositories/review.repository';
import type { TipoServicio } from 'src/reviews/domain/repositories/review.repository';
import { reviewToOutput, ReviewOutput } from './get-reviews.use-case';

@Injectable()
export class CreateReviewUseCase {
  constructor(private readonly reviewRepository: ReviewRepository) {}

  async execute(
    usuario_id: bigint,
    dto: { tipo_servicio: string; calificacion: number; texto: string },
  ): Promise<ReviewOutput> {
    const resena = await this.reviewRepository.create({
      usuario_id,
      tipo_servicio: dto.tipo_servicio as TipoServicio,
      calificacion: dto.calificacion,
      texto: dto.texto,
    });
    return reviewToOutput(resena);
  }
}
