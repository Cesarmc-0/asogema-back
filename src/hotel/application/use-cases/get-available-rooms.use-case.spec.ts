import { GetAvailableRoomsUseCase } from './get-available-rooms.use-case';
import { HotelRoomRepository } from 'src/hotel/domain/repositories/hotel-room.repository.interface';

const mockHotelRepository = {
  findAvailableRooms: jest.fn(),
} as unknown as HotelRoomRepository;

describe('GetAvailableRoomsUseCase', () => {
  let useCase: GetAvailableRoomsUseCase;

  beforeEach(() => {
    useCase = new GetAvailableRoomsUseCase(mockHotelRepository);
  });

  it('debe retornar habitaciones disponibles', async () => {
    const mockRooms = [
      { id: 1n, numero: '101', estado: true },
      { id: 2n, numero: '102', estado: true },
    ];
    mockHotelRepository.findAvailableRooms.mockResolvedValue(mockRooms);

    const result = await useCase.execute({});

    expect(result).toEqual(mockRooms);
    expect(mockHotelRepository.findAvailableRooms).toHaveBeenCalledWith({});
  });

  it('debe pasar filtros de tipo y capacidad', async () => {
    mockHotelRepository.findAvailableRooms.mockResolvedValue([]);

    await useCase.execute({
      tipo_habitacion_id: 1n,
      capacidad_min: 2,
      fecha_entrada: new Date('2026-08-01'),
      fecha_salida: new Date('2026-08-05'),
    });

    expect(mockHotelRepository.findAvailableRooms).toHaveBeenCalledWith({
      tipo_habitacion_id: 1n,
      capacidad_min: 2,
      fecha_entrada: new Date('2026-08-01'),
      fecha_salida: new Date('2026-08-05'),
    });
  });
});
