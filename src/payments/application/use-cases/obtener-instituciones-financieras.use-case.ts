import { Injectable } from '@nestjs/common';
import { PaymentGateway } from 'src/payments/domain/gateways/payment-gateway.interface';

@Injectable()
export class ObtenerInstitucionesFinancierasUseCase {
  constructor(private readonly paymentGateway: PaymentGateway) {}

  async execute() {
    return this.paymentGateway.getFinancialInstitutions();
  }
}
