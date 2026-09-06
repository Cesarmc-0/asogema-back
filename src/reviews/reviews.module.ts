import { Module } from '@nestjs/common';
import { GetReviewsUseCase } from 'src/reviews/application/use-cases/get-reviews.use-case';
import { CreateReviewUseCase } from 'src/reviews/application/use-cases/create-review.use-case';
import { ReviewRepository } from 'src/reviews/domain/repositories/review.repository';
import { PrismaReviewRepository } from 'src/reviews/infrastructure/persistence/prisma-review.repository';
import { ReviewsController } from 'src/reviews/presentation/controllers/reviews.controller';

@Module({
  controllers: [ReviewsController],
  providers: [
    GetReviewsUseCase,
    CreateReviewUseCase,
    { provide: ReviewRepository, useClass: PrismaReviewRepository },
  ],
})
export class ReviewsModule {}
