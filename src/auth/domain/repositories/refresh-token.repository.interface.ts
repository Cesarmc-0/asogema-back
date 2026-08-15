export abstract class RefreshTokenRepository {
  abstract save(
    token: string,
    userId: string,
    ttlSeconds: number,
  ): Promise<void>;
  abstract findUserIdByToken(token: string): Promise<string | null>;
  abstract delete(token: string): Promise<void>;
}
