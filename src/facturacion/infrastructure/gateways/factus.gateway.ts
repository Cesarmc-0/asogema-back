import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  FactusGateway,
  FacturaFactusInput,
  FacturaFactusResponse,
} from '../../domain/gateways/factus-gateway.interface';

interface FactusTokenResponse {
  access_token: string;
  expires_in: number;
}

interface FactusBillResponse {
  data: {
    number: string;
    cufe: string;
    is_validated: boolean;
    links: { qr: string | null; public_url: string | null };
    totals: { total: string };
  };
}

interface FactusPdfResponse {
  status: string;
  message: string;
  data: {
    file_name: string;
    pdf_base_64_encoded: string;
  };
}

@Injectable()
export class FactusGatewayImpl extends FactusGateway {
  private readonly logger = new Logger(FactusGatewayImpl.name);
  private readonly apiUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    super();
    this.apiUrl =
      process.env.FACTUS_API_URL ?? 'https://api-sandbox.factus.com.co';
  }

  async crearFactura(
    input: FacturaFactusInput,
  ): Promise<FacturaFactusResponse> {
    const { data } = await axios.post<FactusBillResponse>(
      `${this.apiUrl}/v2/bills/validate`,
      input,
      { headers: { Authorization: `Bearer ${await this.getToken()}` } },
    );

    return {
      number: data.data.number,
      cufe: data.data.cufe,
      qr_url: data.data.links.qr,
      public_url: data.data.links.public_url,
      is_validated: data.data.is_validated,
      total: data.data.totals.total,
    };
  }

  async descargarPdf(numero: string): Promise<string> {
    const { data } = await axios.get<FactusPdfResponse>(
      `${this.apiUrl}/v2/bills/${numero}/download-pdf`,
      { headers: { Authorization: `Bearer ${await this.getToken()}` } },
    );
    return data.data.pdf_base_64_encoded;
  }

  private async getToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: process.env.FACTUS_CLIENT_ID ?? '',
      client_secret: process.env.FACTUS_CLIENT_SECRET ?? '',
      username: process.env.FACTUS_USERNAME ?? '',
      password: process.env.FACTUS_PASSWORD ?? '',
    });

    const { data } = await axios.post<FactusTokenResponse>(
      `${this.apiUrl}/oauth/token`,
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    const token = data.access_token;
    this.accessToken = token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - 30000;
    this.logger.log('Token Factus renovado');

    return token;
  }
}
