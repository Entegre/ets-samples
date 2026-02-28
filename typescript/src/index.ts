/**
 * Entegre ETS API Client - TypeScript
 * Tum e-belge islemleri icin kullanilabilir.
 */

// Export all types and client
export {
  // Client
  EtsClient,
  createEtsClient,

  // Types - Config
  EtsClientConfig,
  Integrator,
  AuthCredentials,
  ApiResponse,

  // Types - Common
  Address,
  Person,
  Party,
  Tax,
  DocumentLine,
  LegalMonetaryTotal,
  TargetCustomer,
  ArchiveInfo,

  // Types - Invoice
  Invoice,
  InvoiceRequest,
  InvoiceResult,
  InvoiceStatus,
  InvoiceListQuery,
  InvoiceListItem,
  RespondRequest,
  PdfResult,

  // Types - User
  UserCheckResult,
  UserAlias,
  UserAliasResult,

  // Types - Dispatch
  Dispatch,
  DispatchRequest,

  // Types - Producer Receipt
  ProducerReceipt,
  ProducerReceiptRequest,

  // Types - Exchange Rate
  ExchangeRate,
} from './ets-client';

// Default export
export { default } from './ets-client';
