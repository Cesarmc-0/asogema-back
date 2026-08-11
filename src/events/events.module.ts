import { Module } from '@nestjs/common';
import { GetEventsUseCase } from 'src/events/application/use-cases/get-events.use-case';
import { CreateEventBookingUseCase } from 'src/events/application/use-cases/create-event-booking.use-case';
import { EventRepository } from 'src/events/domain/repositories/event-repository.interface';
import { EventsRepositoryImpl } from 'src/events/infrastructure/persistence/events.repository';
import { EventsController } from 'src/events/presentation/controllers/events.controller';

@Module({
  controllers: [EventsController],
  providers: [
    GetEventsUseCase,
    CreateEventBookingUseCase,
    { provide: EventRepository, useClass: EventsRepositoryImpl },
  ],
})
export class EventsModule {}
