import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GetMenuUseCase } from 'src/restaurant/menu/application/use-cases/get-menu.use-case';
import { Public } from 'src/auth/presentation/dto/decorators/public.decorator';

/**
 * Controller del menú público del restaurante.
 * Sin endpoints autenticados.
 */
@ApiTags('restaurant')
@Controller('restaurant/menu')
export class MenuController {
  constructor(private readonly menuUseCase: GetMenuUseCase) {}

  @Public()
  @ApiOperation({ summary: 'Obtener menú del restaurante' })
  @Get()
  async getMenu() {
    return await this.menuUseCase.execute();
  }
}
