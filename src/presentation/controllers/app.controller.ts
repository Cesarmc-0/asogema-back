import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('App')
@Controller()
export class AppController {
  @ApiOperation({ summary: 'Estado y versión de la API' })
  @ApiResponse({
    status: 200,
    description: 'Nombre, version y estado del backend',
  })
  @Get()
  getStatus(): { name: string; version: string; status: string } {
    return {
      name: 'asogema-back',
      version: '0.0.1',
      status: 'ok',
    };
  }
}
