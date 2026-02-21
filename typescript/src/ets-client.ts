/**
 * Entegre ETS API Client - TypeScript
 */

import axios, { AxiosInstance } from 'axios';

// ==================== TYPES ====================

export interface EntegreId {
  PartyIdentificationId: string;
  Username: string;
  Password: string;
  SoftwareId: string;
  Integrator: 'UYM' | 'UYK' | 'IZI' | 'DGN' | 'MYS';
}

export interface ResponseModel<T> {
  Data?: T;
  Message?: string;
  Success: boolean;
}

export interface Address {
  Country?: string;
  CityName?: string;
  CitySubdivisionName?: string;
  StreetName?: string;
  BuildingNumber?: string;
  PostalZone?: string;
}

export interface Party {
  PartyIdentification: string;
  PartyName: string;
  TaxOffice?: string;
  Alias?: string;
  Address?: Address;
}

export interface Tax {
  TaxCode: string;
  TaxName: string;
  Percent: number;
  TaxAmount: number;
}

export interface DocumentLine {
  ItemCode: string;
  ItemName: string;
  InvoicedQuantity: number;
  IsoUnitCode: string;
  Price: number;
  LineExtensionAmount?: number;
  Taxes?: Tax[];
}

export interface TaxSubtotal {
  TaxCode: string;
  TaxName: string;
  TaxableAmount: number;
  TaxAmount: number;
  Percent: number;
}

export interface TaxTotal {
  TaxAmount: number;
  TaxSubtotals?: TaxSubtotal[];
}

export interface Invoice {
  InvoiceTypeCode: string;
  ProfileId: string;
  IssueDate: string;
  DocumentCurrencyCode?: string;
  Notes?: string[];
  Supplier: Party;
  Customer: Party;
  Lines: DocumentLine[];
  LineExtensionAmount?: number;
  TaxExclusiveAmount?: number;
  TaxInclusiveAmount?: number;
  PayableAmount?: number;
  TaxTotal?: TaxTotal;
}

export interface InvoiceModel {
  EtsToken?: string;
  Invoice: Invoice;
  TargetCustomer?: { Alias: string };
  ArchiveInfo?: { SendType: string };
}

export interface InvoiceResult {
  Uuid?: string;
  Number?: string;
  Code?: string;
  Message?: string;
}

export interface InvoiceStatus {
  Status?: string;
  StatusCode?: string;
  StatusDate?: string;
}

export interface UserAlias {
  Alias: string;
  Type: string;
  RegisterDate?: string;
}

export interface ExchangeRate {
  Currency?: string;
  Rate?: number;
  Date?: string;
}

// ==================== CLIENT ====================

export class EtsClient {
  private baseUrl: string;
  private etsToken: string | null = null;
  private client: AxiosInstance;

  constructor(baseUrl: string = 'https://ets-test.bulutix.com') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /**
   * Kimlik dogrulama yapar ve EtsToken alir.
   */
  async authenticate(entegreId: EntegreId): Promise<string> {
    const response = await this.client.post<ResponseModel<{ EtsToken: string }>>(
      '/auth/token',
      entegreId
    );

    if (!response.data.Success) {
      throw new Error(`Authentication failed: ${response.data.Message}`);
    }

    this.etsToken = response.data.Data!.EtsToken;
    return this.etsToken;
  }

  // ==================== E-FATURA ====================

  /**
   * E-Fatura mukellefi mi sorgular.
   */
  async checkEInvoiceUser(partyId: string): Promise<boolean> {
    const result = await this.post<{ IsActive: boolean }>(`/invoice/user/${partyId}`);
    return result?.IsActive ?? false;
  }

  /**
   * Kullanici alias listesini getirir.
   */
  async getUserAliases(partyId: string): Promise<UserAlias[]> {
    const result = await this.post<{ Aliases: UserAlias[] }>(`/invoice/user/${partyId}/alias`);
    return result?.Aliases ?? [];
  }

  /**
   * E-Fatura gonderir.
   */
  async sendInvoice(invoice: InvoiceModel): Promise<InvoiceResult> {
    invoice.EtsToken = this.etsToken!;
    const result = await this.post<InvoiceResult>('/invoice', invoice);
    return result ?? {};
  }

  /**
   * Taslak fatura gonderir.
   */
  async sendDraftInvoice(invoice: InvoiceModel): Promise<InvoiceResult> {
    invoice.EtsToken = this.etsToken!;
    const result = await this.post<InvoiceResult>('/invoice/draft', invoice);
    return result ?? {};
  }

  /**
   * Fatura durumunu sorgular.
   */
  async getInvoiceStatus(uuid: string): Promise<InvoiceStatus> {
    const result = await this.get<InvoiceStatus>(`/invoice/${uuid}/status`);
    return result ?? {};
  }

  /**
   * Faturaya yanit verir (Kabul/Red).
   */
  async respondInvoice(
    uuid: string,
    responseType: 'KABUL' | 'RED',
    description: string = ''
  ): Promise<InvoiceResult> {
    const result = await this.post<InvoiceResult>(`/invoice/${uuid}/respond`, {
      ResponseType: responseType,
      Description: description,
    });
    return result ?? {};
  }

  // ==================== E-ARSIV ====================

  /**
   * E-Arsiv fatura gonderir.
   */
  async sendEArchive(invoice: InvoiceModel, sendType: string = 'KAGIT'): Promise<InvoiceResult> {
    invoice.EtsToken = this.etsToken!;
    invoice.ArchiveInfo = { SendType: sendType };
    const result = await this.post<InvoiceResult>('/earchive', invoice);
    return result ?? {};
  }

  /**
   * E-Arsiv fatura durumunu sorgular.
   */
  async getEArchiveStatus(uuid: string): Promise<InvoiceStatus> {
    const result = await this.get<InvoiceStatus>(`/earchive/${uuid}/status`);
    return result ?? {};
  }

  /**
   * E-Arsiv faturayi iptal eder.
   */
  async cancelEArchive(uuid: string): Promise<InvoiceResult> {
    const result = await this.post<InvoiceResult>(`/earchive/${uuid}/cancel`);
    return result ?? {};
  }

  // ==================== E-IRSALIYE ====================

  /**
   * E-Irsaliye mukellefi mi sorgular.
   */
  async checkEDispatchUser(partyId: string): Promise<boolean> {
    const result = await this.post<{ IsActive: boolean }>(`/dispatch/user/${partyId}`);
    return result?.IsActive ?? false;
  }

  // ==================== DOVIZ KURU ====================

  /**
   * Doviz kurunu sorgular.
   */
  async getExchangeRate(currency: string, date: string): Promise<ExchangeRate> {
    const result = await this.get<ExchangeRate>(
      `/currency/rate?currency=${currency}&date=${date}`
    );
    return result ?? {};
  }

  // ==================== PRIVATE METHODS ====================

  private async get<T>(endpoint: string): Promise<T | undefined> {
    const url = endpoint.includes('?')
      ? `${endpoint}&EtsToken=${this.etsToken}`
      : `${endpoint}?EtsToken=${this.etsToken}`;

    const response = await this.client.get<ResponseModel<T>>(url);

    if (!response.data.Success) {
      throw new Error(`Request failed: ${response.data.Message}`);
    }

    return response.data.Data;
  }

  private async post<T>(endpoint: string, data?: object): Promise<T | undefined> {
    const requestData = { ...data, EtsToken: this.etsToken };

    const response = await this.client.post<ResponseModel<T>>(endpoint, requestData);

    if (!response.data.Success) {
      throw new Error(`Request failed: ${response.data.Message}`);
    }

    return response.data.Data;
  }
}
