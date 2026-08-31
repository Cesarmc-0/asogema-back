import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../../auth/presentation/dto/decorators/public.decorator';
import { ListarConfiguracionesUseCase } from '../../application/use-cases/listar-configuraciones.use-case';

@Controller('configuraciones')
@Public()
export class ConfiguracionesController {
  constructor(
    private readonly listarConfiguracionesUseCase: ListarConfiguracionesUseCase,
  ) {}

  @Get()
  findAll() {
    return this.listarConfiguracionesUseCase.execute();
  }

  @Get(':categoria')
  findOne(@Param('categoria') categoria: string) {
    return this.listarConfiguracionesUseCase.findByCategoria(categoria);
  }
}
