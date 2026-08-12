import { LogoutUseCase } from './logout.use-case';
import { RefreshTokenRepository } from '../../../auth/domain/repositories/refresh-token.repository.interface';

const mockRefreshTokenRepository = {
  delete: jest.fn().mockResolvedValue(undefined),
} as unknown as RefreshTokenRepository;

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;

  beforeEach(() => {
    useCase = new LogoutUseCase(mockRefreshTokenRepository);
    jest.clearAllMocks();
  });

  it('revoca el refresh token y responde sesión cerrada', async () => {
    const result = await useCase.execute({ refresh_token: 'token_a_revocar' });

    expect(mockRefreshTokenRepository.delete).toHaveBeenCalledWith(
      'token_a_revocar',
    );
    expect(result).toEqual({ message: 'Sesión cerrada correctamente' });
  });
});
