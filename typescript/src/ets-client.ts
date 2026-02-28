/**
 * Entegre ETS API Client - TypeScript
 * Tum e-belge islemleri icin kullanilabilir.
 */

import axios, { AxiosInstance } from 'axios';

// ==================== TYPES ====================

export type Integrator = 'UYM' | 'UYK' | 'IZI' | 'DGN' | 'MYS';

export interface EtsClientConfig {
  baseUrl?: string;
  integrator?: Integrator;
  softwareId?: string;
}

export interface AuthCredentials {
  partyId: string;
  username: string;
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface Address {
  Country?: string;
  CityName?: string;
  CitySubdivisionName?: string;
  DistrictName?: string;
  StreetName?: string;
  BuildingNumber?: string;
  PostalZone?: string;
}

export interface Person {
  FirstName: string;
  FamilyName: string;
}

export interface Party {
  PartyIdentification: string;
  PartyName: string;
  PartyTaxScheme?: string;
  Alias?: string;
  Address?: Address;
  Person?: Person;
}

export interface Tax {
  TaxCode: string;
  TaxName: string;
  Percent: number;
  TaxAmount: number;
  ExemptionReason?: string;
  ExemptionReasonCode?: string;
}

export interface DocumentLine {
  ItemCode: string;
  ItemName: string;
  Description?: string;
  InvoicedQuantity: number;
  IsoUnitCode: string;
  CurrencyId?: string;
  Price: number;
  LineExtensionAmount?: number;
  Taxes?: Tax[];
}

export interface LegalMonetaryTotal {
  LineExtensionAmount: number;
  TaxExclusiveAmount?: number;
  TaxInclusiveAmount?: number;
  AllowanceTotalAmount?: number;
  PayableAmount: number;
}

export interface Invoice {
  IsDraft?: boolean;
  InvoiceId?: string;
  InvoiceTypeCode: string;
  ProfileId: string;
  IssueDate: string;
  DocumentCurrencyCode?: string;
  CurrencyId?: string;
  Notes?: string[];
  SupplierParty: Party;
  CustomerParty: Party;
  DocumentLines: DocumentLine[];
  LegalMonetaryTotal: LegalMonetaryTotal;
  TaxTotals?: Tax[];
}

export interface TargetCustomer {
  PartyName: string;
  PartyIdentification: string;
  Alias?: string;
}

export interface ArchiveInfo {
  SendingType: 'ELEKTRONIK' | 'KAGIT';
  IsInternetSales?: boolean;
}

export interface InvoiceRequest {
  EtsToken?: string;
  Invoice: Invoice;
  TargetCustomer?: TargetCustomer;
  ArchiveInfo?: ArchiveInfo;
}

export interface InvoiceResult {
  uuid?: string;
  invoiceNumber?: string;
  message?: string;
  code?: string;
}

export interface InvoiceStatus {
  uuid?: string;
  invoiceNumber?: string;
  status?: string;
  statusDescription?: string;
}

export interface UserCheckResult {
  partyId: string;
  isActive: boolean;
}

export interface UserAlias {
  alias: string;
  creationTime?: string;
}

export interface UserAliasResult {
  partyIdentificationId: string;
  title?: string;
  type?: string;
  registerTime?: string;
  senderboxAliases: UserAlias[];
  receiverboxAliases: UserAlias[];
}

export interface ExchangeRate {
  currency: string;
  buyingRate?: number;
  sellingRate?: number;
  effectiveRate?: number;
  date?: string;
}

export interface InvoiceListQuery {
  startDate: string;
  endDate: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface InvoiceListItem {
  uuid?: string;
  invoiceNumber?: string;
  issueDate?: string;
  customerName?: string;
  customerTaxId?: string;
  payableAmount?: number;
  currencyCode?: string;
  status?: string;
}

export interface PdfResult {
  pdfContent?: string; // Base64 encoded
  fileName?: string;
}

export interface RespondRequest {
  responseType: 'KABUL' | 'RED';
  description?: string;
}

// ==================== E-IRSALIYE TYPES ====================

export interface Dispatch {
  DispatchId?: string;
  ProfileId: string;
  IssueDate: string;
  DispatchTypeCode: string;
  CurrencyId?: string;
  Notes?: string[];
  SupplierParty: Party;
  CustomerParty: Party;
  DocumentLines: DocumentLine[];
}

export interface DispatchRequest {
  EtsToken?: string;
  Dispatch: Dispatch;
  TargetCustomer?: TargetCustomer;
}

// ==================== E-MUSTAHSIL TYPES ====================

export interface ProducerReceipt {
  ReceiptId?: string;
  ProfileId: string;
  IssueDate: string;
  CurrencyId?: string;
  Notes?: string[];
  SupplierParty: Party;
  CustomerParty: Party;
  DocumentLines: DocumentLine[];
  LegalMonetaryTotal: LegalMonetaryTotal;
}

export interface ProducerReceiptRequest {
  EtsToken?: string;
  ProducerReceipt: ProducerReceipt;
}

// ==================== CLIENT ====================

export class EtsClient {
  private client: AxiosInstance;
  private etsToken: string | null = null;
  private config: Required<EtsClientConfig>;

  constructor(config: EtsClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://ets.bulutix.com',
      integrator: config.integrator || 'UYM',
      softwareId: config.softwareId || 'ETS-CLIENT',
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  // ==================== AUTH ====================

  /**
   * Kimlik dogrulama yapar ve EtsToken alir.
   */
  async authenticate(credentials: AuthCredentials): Promise<ApiResponse<{ token: string }>> {
    const response = await this.client.post('/auth/token', {
      PartyIdentificationId: credentials.partyId,
      Username: credentials.username,
      Password: credentials.password,
      SoftwareId: this.config.softwareId,
      Integrator: this.config.integrator,
    });

    if (response.data.success && response.data.data?.token) {
      this.etsToken = response.data.data.token;
    }

    return response.data;
  }

  /**
   * Token'i manuel olarak ayarlar.
   */
  setToken(token: string): void {
    this.etsToken = token;
  }

  /**
   * Mevcut token'i dondurur.
   */
  getToken(): string | null {
    return this.etsToken;
  }

  // ==================== E-FATURA ====================

  /**
   * E-Fatura mukellefi mi sorgular.
   */
  async checkEInvoiceUser(partyId: string): Promise<ApiResponse<UserCheckResult>> {
    return this.post(`/invoice/user/${partyId}`);
  }

  /**
   * Kullanici alias listesini getirir.
   */
  async getUserAliases(partyId: string): Promise<ApiResponse<UserAliasResult>> {
    return this.post(`/invoice/user/${partyId}/alias`);
  }

  /**
   * E-Fatura gonderir.
   */
  async sendInvoice(request: InvoiceRequest): Promise<ApiResponse<InvoiceResult>> {
    return this.post('/invoice', request);
  }

  /**
   * Taslak fatura gonderir.
   */
  async sendDraftInvoice(request: InvoiceRequest): Promise<ApiResponse<InvoiceResult>> {
    return this.post('/invoice/draft', request);
  }

  /**
   * Fatura durumunu sorgular.
   */
  async getInvoiceStatus(uuid: string): Promise<ApiResponse<InvoiceStatus>> {
    return this.get(`/invoice/${uuid}/status`);
  }

  /**
   * Faturaya yanit verir (Kabul/Red).
   */
  async respondInvoice(uuid: string, request: RespondRequest): Promise<ApiResponse<InvoiceResult>> {
    return this.post(`/invoice/${uuid}/respond`, {
      ResponseType: request.responseType,
      Description: request.description,
    });
  }

  /**
   * Gelen fatura listesini getirir.
   */
  async getInboxInvoices(query: InvoiceListQuery): Promise<ApiResponse<InvoiceListItem[]>> {
    return this.post('/invoice/inbox', query);
  }

  /**
   * Fatura PDF'ini indirir.
   */
  async getInvoicePdf(uuid: string): Promise<ApiResponse<PdfResult>> {
    return this.get(`/invoice/${uuid}/pdf`);
  }

  // ==================== E-ARSIV ====================

  /**
   * E-Arsiv fatura gonderir.
   */
  async sendEArchiveInvoice(request: InvoiceRequest): Promise<ApiResponse<InvoiceResult>> {
    return this.post('/earchive', request);
  }

  /**
   * Toplu E-Arsiv fatura gonderir.
   */
  async sendEArchiveInvoices(requests: InvoiceRequest[]): Promise<ApiResponse<InvoiceResult[]>> {
    return this.post('/earchive/batch', { Invoices: requests });
  }

  /**
   * E-Arsiv fatura durumunu sorgular.
   */
  async getEArchiveStatus(uuid: string): Promise<ApiResponse<InvoiceStatus>> {
    return this.get(`/earchive/${uuid}/status`);
  }

  /**
   * E-Arsiv faturayi iptal eder.
   */
  async cancelEArchive(uuid: string, cancelDate?: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.post(`/earchive/${uuid}/cancel`, { CancelDate: cancelDate });
  }

  /**
   * E-Arsiv fatura PDF'ini indirir.
   */
  async getEArchivePdf(uuid: string): Promise<ApiResponse<PdfResult>> {
    return this.get(`/earchive/${uuid}/pdf`);
  }

  /**
   * E-Arsiv fatura listesini getirir.
   */
  async getEArchiveList(query: InvoiceListQuery): Promise<ApiResponse<InvoiceListItem[]>> {
    return this.post('/earchive/list', query);
  }

  // ==================== E-IRSALIYE ====================

  /**
   * E-Irsaliye mukellefi mi sorgular.
   */
  async checkEDispatchUser(partyId: string): Promise<ApiResponse<UserCheckResult>> {
    return this.post(`/dispatch/user/${partyId}`);
  }

  /**
   * E-Irsaliye kullanici alias listesini getirir.
   */
  async getDispatchUserAliases(partyId: string): Promise<ApiResponse<UserAliasResult>> {
    return this.post(`/dispatch/user/${partyId}/alias`);
  }

  /**
   * E-Irsaliye gonderir.
   */
  async sendDispatch(request: DispatchRequest): Promise<ApiResponse<InvoiceResult>> {
    return this.post('/dispatch', request);
  }

  /**
   * Taslak E-Irsaliye gonderir.
   */
  async sendDraftDispatch(request: DispatchRequest): Promise<ApiResponse<InvoiceResult>> {
    return this.post('/dispatch/draft', request);
  }

  /**
   * E-Irsaliye durumunu sorgular.
   */
  async getDispatchStatus(uuid: string): Promise<ApiResponse<InvoiceStatus>> {
    return this.get(`/dispatch/${uuid}/status`);
  }

  // ==================== E-MUSTAHSIL ====================

  /**
   * E-Mustahsil makbuzu gonderir.
   */
  async sendProducerReceipt(request: ProducerReceiptRequest): Promise<ApiResponse<InvoiceResult>> {
    return this.post('/producer', request);
  }

  /**
   * Toplu E-Mustahsil makbuzu gonderir.
   */
  async sendProducerReceipts(requests: ProducerReceiptRequest[]): Promise<ApiResponse<InvoiceResult[]>> {
    return this.post('/producer/batch', { Receipts: requests });
  }

  /**
   * E-Mustahsil makbuz durumunu sorgular.
   */
  async getProducerReceiptStatus(uuid: string): Promise<ApiResponse<InvoiceStatus>> {
    return this.get(`/producer/${uuid}/status`);
  }

  // ==================== DOVIZ KURU ====================

  /**
   * Belirli bir doviz kurunu sorgular.
   */
  async getExchangeRate(currency: string, date?: string): Promise<ApiResponse<ExchangeRate>> {
    const params = new URLSearchParams({ currency });
    if (date) params.append('date', date);
    return this.get(`/currency/rate?${params.toString()}`);
  }

  /**
   * Tum doviz kurlarini getirir.
   */
  async getAllExchangeRates(date?: string): Promise<ApiResponse<ExchangeRate[]>> {
    const params = date ? `?date=${date}` : '';
    return this.get(`/currency/rates${params}`);
  }

  // ==================== PRIVATE METHODS ====================

  private async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${endpoint}${separator}EtsToken=${this.etsToken}`;
    const response = await this.client.get(url);
    return response.data;
  }

  private async post<T>(endpoint: string, data: object = {}): Promise<ApiResponse<T>> {
    const requestData = { ...data, EtsToken: this.etsToken };
    const response = await this.client.post(endpoint, requestData);
    return response.data;
  }
}

// ==================== FACTORY ====================

export function createEtsClient(config?: EtsClientConfig): EtsClient {
  return new EtsClient(config);
}

export default EtsClient;
