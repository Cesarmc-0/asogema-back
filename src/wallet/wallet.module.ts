import { Module } from '@nestjs/common';
import { PaymentsModule } from 'src/payments/payments.module';
import { CrearRecargaUseCase } from './application/use-cases/crear-recarga.use-case';
import { ConsultarSaldoUseCase } from './application/use-cases/consultar-saldo.use-case';
import { WalletController } from './presentation/controllers/wallet.controller';

@Module({
  imports: [PaymentsModule],
  controllers: [WalletController],
  providers: [CrearRecargaUseCase, ConsultarSaldoUseCase],
  exports: [ConsultarSaldoUseCase],
})
export class WalletModule {}
