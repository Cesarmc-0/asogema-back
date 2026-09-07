import { Module } from '@nestjs/common';
import { GetEventsUseCase } from 'src/events/application/use-cases/get-events.use-case';
import { CreateEventBookingUseCase } from 'src/events/application/use-cases/create-event-booking.use-case';
import { GetMyEventBookingsUseCase } from 'src/events/application/use-cases/get-my-event-bookings.use-case';
import { EventRepository } from 'src/events/domain/repositories/event-repository.interface';
import { EventsRepositoryImpl } from 'src/events/infrastructure/persistence/events.repository';
import { EventsController } from 'src/events/presentation/controllers/events.controller';
import { PaymentsModule } from 'src/payments/payments.module';

@Module({
  imports: [PaymentsModule],
  controllers: [EventsController],
  providers: [
    GetEventsUseCase,
    CreateEventBookingUseCase,
    GetMyEventBookingsUseCase,
    { provide: EventRepository, useClass: EventsRepositoryImpl },
  ],
})
export class EventsModule {}
