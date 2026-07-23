import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {


  @Get()
  getStatus(): {name : string; version: string; status: string}{
    return {
      name : 'asogema-back',
      version : '0.0.1',
      status : 'ok',
    };
  }
}
