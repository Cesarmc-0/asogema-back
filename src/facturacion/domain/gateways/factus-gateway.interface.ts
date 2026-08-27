export interface FacturaItemInput {
  code_reference: string;
  name: string;
  quantity: string;
  price: string;
  unit_measure_code: string;
  standard_code: string;
  taxes: { code: string; rate: string }[];
}

export interface FacturaFactusInput {
  reference_code: string;
  send_email: boolean;
  observation: string;
  payment_details: {
    payment_form: string;
    payment_method_code: string;
    reference_code: string;
    amount: string;
  }[];
  customer: {
    identification_document_code: string;
    identification: string;
    names: string;
    address: string;
    email: string;
    phone: string;
    legal_organization_code: string;
    country_code: string;
  };
  items: FacturaItemInput[];
}

export interface FacturaFactusResponse {
  number: string;
  cufe: string;
  qr_url: string | null;
  public_url: string | null;
  is_validated: boolean;
  total: string;
}

export abstract class FactusGateway {
  abstract crearFactura(
    input: FacturaFactusInput,
  ): Promise<FacturaFactusResponse>;
  abstract descargarPdf(numero: string): Promise<string>;
}
