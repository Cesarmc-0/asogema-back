import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GetReviewsUseCase } from 'src/reviews/application/use-cases/get-reviews.use-case';
import { CreateReviewUseCase } from 'src/reviews/application/use-cases/create-review.use-case';
import { CreateReviewDto } from '../dto/create-review.dto';
import { GetReviewsQueryDto } from '../dto/get-reviews-query.dto';
import { CurrentUser } from 'src/auth/presentation/dto/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/domain/interfaces/authenticated-user.interface';
import { Public } from 'src/auth/presentation/dto/decorators/public.decorator';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly getReviewsUseCase: GetReviewsUseCase,
    private readonly createReviewUseCase: CreateReviewUseCase,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Obtener reseñas por tipo de servicio' })
  @ApiQuery({ name: 'service', enum: ['hotel', 'restaurant', 'events'] })
  @Get()
  async getReviews(@Query() query: GetReviewsQueryDto) {
    return this.getReviewsUseCase.execute(query.service);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear una reseña' })
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createReview(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createReviewUseCase.execute(user.id, dto);
  }
}
