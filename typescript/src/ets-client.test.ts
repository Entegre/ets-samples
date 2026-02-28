/**
 * ETS Client Unit Tests
 * Tum endpoint'ler icin kapsamli testler
 *
 * Calistirmak icin: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { EtsClient, InvoiceRequest, DispatchRequest, ProducerReceiptRequest } from './ets-client';

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: vi.fn(),
      get: vi.fn(),
    })),
  },
}));

describe('EtsClient', () => {
  let client: EtsClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance = {
      post: vi.fn(),
      get: vi.fn(),
    };
    (axios.create as any).mockReturnValue(mockAxiosInstance);
    client = new EtsClient({
      baseUrl: 'https://test.api.com',
      integrator: 'UYM',
    });
  });

  // ==================== AUTH TESTS ====================

  describe('Authentication', () => {
    it('should authenticate successfully and store token', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { token: 'test-token-123' },
          message: 'OK',
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.authenticate({
        partyId: '1234567890',
        username: 'testuser',
        password: 'testpass',
      });

      expect(result.success).toBe(true);
      expect(result.data?.token).toBe('test-token-123');
      expect(client.getToken()).toBe('test-token-123');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/token', {
        PartyIdentificationId: '1234567890',
        Username: 'testuser',
        Password: 'testpass',
        SoftwareId: 'ETS-CLIENT',
        Integrator: 'UYM',
      });
    });

    it('should handle authentication failure', async () => {
      const mockResponse = {
        data: {
          success: false,
          message: 'Invalid credentials',
          data: null,
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.authenticate({
        partyId: '1234567890',
        username: 'wrong',
        password: 'wrong',
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid credentials');
      expect(client.getToken()).toBeNull();
    });

    it('should allow manual token setting', () => {
      client.setToken('manual-token');
      expect(client.getToken()).toBe('manual-token');
    });
  });

  // ==================== E-FATURA TESTS ====================

  describe('E-Fatura - User Check', () => {
    it('should return true for e-invoice user', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { partyId: '1234567890', isActive: true },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.checkEInvoiceUser('1234567890');

      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/invoice/user/1234567890',
        expect.objectContaining({ EtsToken: null })
      );
    });

    it('should return false for non e-invoice user', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { partyId: '12345678901', isActive: false },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.checkEInvoiceUser('12345678901');

      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(false);
    });
  });

  describe('E-Fatura - User Aliases', () => {
    it('should return user aliases', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            partyIdentificationId: '1234567890',
            title: 'Test Company',
            type: 'OZEL',
            registerTime: '2020-01-01T00:00:00',
            senderboxAliases: [
              { alias: 'urn:mail:defaultgb@test.com', creationTime: '2020-01-01' },
            ],
            receiverboxAliases: [
              { alias: 'urn:mail:defaultpk@test.com', creationTime: '2020-01-01' },
            ],
          },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.getUserAliases('1234567890');

      expect(result.success).toBe(true);
      expect(result.data?.senderboxAliases).toHaveLength(1);
      expect(result.data?.receiverboxAliases).toHaveLength(1);
      expect(result.data?.title).toBe('Test Company');
    });

    it('should handle user with no aliases', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            partyIdentificationId: '1234567890',
            senderboxAliases: [],
            receiverboxAliases: [],
          },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.getUserAliases('1234567890');

      expect(result.success).toBe(true);
      expect(result.data?.senderboxAliases).toHaveLength(0);
    });
  });

  describe('E-Fatura - Send Invoice', () => {
    const sampleInvoice: InvoiceRequest = {
      Invoice: {
        InvoiceId: 'INV2024000001',
        InvoiceTypeCode: 'SATIS',
        ProfileId: 'TEMELFATURA',
        IssueDate: '2024-01-01',
        CurrencyId: 'TRY',
        SupplierParty: {
          PartyIdentification: '1234567890',
          PartyName: 'Test Supplier',
          PartyTaxScheme: 'TEST VD',
        },
        CustomerParty: {
          PartyIdentification: '0987654321',
          PartyName: 'Test Customer',
          PartyTaxScheme: 'TEST VD',
        },
        DocumentLines: [
          {
            ItemCode: 'ITEM-001',
            ItemName: 'Test Item',
            InvoicedQuantity: 1,
            IsoUnitCode: 'C62',
            Price: 100,
            LineExtensionAmount: 100,
            Taxes: [{ TaxCode: '0015', TaxName: 'KDV', Percent: 20, TaxAmount: 20 }],
          },
        ],
        LegalMonetaryTotal: {
          LineExtensionAmount: 100,
          TaxInclusiveAmount: 120,
          PayableAmount: 120,
        },
      },
      TargetCustomer: {
        PartyName: 'Test Customer',
        PartyIdentification: '0987654321',
        Alias: 'urn:mail:defaultpk@test.com',
      },
    };

    it('should send invoice successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            uuid: 'test-uuid-123',
            invoiceNumber: 'INV2024000001',
          },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendInvoice(sampleInvoice);

      expect(result.success).toBe(true);
      expect(result.data?.uuid).toBe('test-uuid-123');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/invoice',
        expect.objectContaining({ Invoice: sampleInvoice.Invoice })
      );
    });

    it('should send draft invoice successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            uuid: 'draft-uuid-123',
            invoiceNumber: 'INV2024000001',
          },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendDraftInvoice(sampleInvoice);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/invoice/draft',
        expect.any(Object)
      );
    });
  });

  describe('E-Fatura - Invoice Status', () => {
    it('should get invoice status', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            uuid: 'test-uuid',
            invoiceNumber: 'INV2024000001',
            status: 'APPROVED',
            statusDescription: 'Fatura onaylandi',
          },
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getInvoiceStatus('test-uuid');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('APPROVED');
    });
  });

  describe('E-Fatura - Respond Invoice', () => {
    it('should accept invoice', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { uuid: 'test-uuid', message: 'Fatura kabul edildi' },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.respondInvoice('test-uuid', {
        responseType: 'KABUL',
        description: 'Fatura kabul edilmistir',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/invoice/test-uuid/respond',
        expect.objectContaining({ ResponseType: 'KABUL' })
      );
    });

    it('should reject invoice', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { uuid: 'test-uuid', message: 'Fatura reddedildi' },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.respondInvoice('test-uuid', {
        responseType: 'RED',
        description: 'Yanlis urun gonderilmis',
      });

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/invoice/test-uuid/respond',
        expect.objectContaining({ ResponseType: 'RED' })
      );
    });
  });

  // ==================== E-ARSIV TESTS ====================

  describe('E-Arsiv - Send Invoice', () => {
    const sampleEArchive: InvoiceRequest = {
      Invoice: {
        InvoiceId: 'EAR2024000001',
        InvoiceTypeCode: 'SATIS',
        ProfileId: 'EARSIVFATURA',
        IssueDate: '2024-01-01',
        CurrencyId: 'TRY',
        SupplierParty: {
          PartyIdentification: '1234567890',
          PartyName: 'Test Supplier',
        },
        CustomerParty: {
          PartyIdentification: '12345678901',
          PartyName: 'Test Customer',
          Person: { FirstName: 'Ahmet', FamilyName: 'Yilmaz' },
        },
        DocumentLines: [
          {
            ItemCode: 'ITEM-001',
            ItemName: 'Test Item',
            InvoicedQuantity: 1,
            IsoUnitCode: 'C62',
            Price: 100,
            Taxes: [{ TaxCode: '0015', TaxName: 'KDV', Percent: 20, TaxAmount: 20 }],
          },
        ],
        LegalMonetaryTotal: {
          LineExtensionAmount: 100,
          PayableAmount: 120,
        },
      },
      ArchiveInfo: {
        SendingType: 'ELEKTRONIK',
        IsInternetSales: false,
      },
    };

    it('should send e-archive invoice successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            uuid: 'earchive-uuid-123',
            invoiceNumber: 'EAR2024000001',
          },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendEArchiveInvoice(sampleEArchive);

      expect(result.success).toBe(true);
      expect(result.data?.uuid).toBe('earchive-uuid-123');
    });

    it('should handle duplicate invoice number error', async () => {
      const mockResponse = {
        data: {
          success: false,
          message: 'Hata Kodu: 11603 | Fatura numarası daha önce kullanılmış',
          data: null,
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendEArchiveInvoice(sampleEArchive);

      expect(result.success).toBe(false);
      expect(result.message).toContain('11603');
    });

    it('should send batch e-archive invoices', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { uuid: 'uuid-1', invoiceNumber: 'EAR001' },
            { uuid: 'uuid-2', invoiceNumber: 'EAR002' },
          ],
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendEArchiveInvoices([sampleEArchive, sampleEArchive]);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  describe('E-Arsiv - Status & Cancel', () => {
    it('should get e-archive status', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            uuid: 'test-uuid',
            status: 'SENT',
            statusDescription: 'GIB\'e gonderildi',
          },
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getEArchiveStatus('test-uuid');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('SENT');
    });

    it('should cancel e-archive invoice', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { success: true },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.cancelEArchive('test-uuid', '2024-01-15');

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/earchive/test-uuid/cancel',
        expect.objectContaining({ CancelDate: '2024-01-15' })
      );
    });
  });

  describe('E-Arsiv - PDF & List', () => {
    it('should get e-archive PDF', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            pdfContent: 'base64encodedcontent',
            fileName: 'invoice.pdf',
          },
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getEArchivePdf('test-uuid');

      expect(result.success).toBe(true);
      expect(result.data?.pdfContent).toBe('base64encodedcontent');
    });

    it('should get e-archive list', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { uuid: 'uuid-1', invoiceNumber: 'EAR001', payableAmount: 1200 },
            { uuid: 'uuid-2', invoiceNumber: 'EAR002', payableAmount: 2400 },
          ],
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.getEArchiveList({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        pageIndex: 0,
        pageSize: 10,
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });
  });

  // ==================== E-IRSALIYE TESTS ====================

  describe('E-Irsaliye - User Check', () => {
    it('should check e-dispatch user', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { partyId: '1234567890', isActive: true },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.checkEDispatchUser('1234567890');

      expect(result.success).toBe(true);
      expect(result.data?.isActive).toBe(true);
    });

    it('should get dispatch user aliases', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            partyIdentificationId: '1234567890',
            senderboxAliases: [{ alias: 'urn:mail:irsaliyegb@test.com' }],
            receiverboxAliases: [{ alias: 'urn:mail:irsaliyepk@test.com' }],
          },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.getDispatchUserAliases('1234567890');

      expect(result.success).toBe(true);
      expect(result.data?.senderboxAliases).toHaveLength(1);
    });
  });

  describe('E-Irsaliye - Send', () => {
    const sampleDispatch: DispatchRequest = {
      Dispatch: {
        DispatchId: 'DIS2024000001',
        ProfileId: 'TEMELIRSALIYE',
        IssueDate: '2024-01-01',
        DispatchTypeCode: 'SEVK',
        SupplierParty: {
          PartyIdentification: '1234567890',
          PartyName: 'Test Supplier',
        },
        CustomerParty: {
          PartyIdentification: '0987654321',
          PartyName: 'Test Customer',
        },
        DocumentLines: [
          {
            ItemCode: 'ITEM-001',
            ItemName: 'Test Item',
            InvoicedQuantity: 10,
            IsoUnitCode: 'C62',
            Price: 100,
          },
        ],
      },
    };

    it('should send dispatch successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { uuid: 'dispatch-uuid', invoiceNumber: 'DIS2024000001' },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendDispatch(sampleDispatch);

      expect(result.success).toBe(true);
      expect(result.data?.uuid).toBe('dispatch-uuid');
    });

    it('should send draft dispatch', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { uuid: 'draft-dispatch-uuid' },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendDraftDispatch(sampleDispatch);

      expect(result.success).toBe(true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/dispatch/draft',
        expect.any(Object)
      );
    });

    it('should get dispatch status', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { uuid: 'dispatch-uuid', status: 'DELIVERED' },
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getDispatchStatus('dispatch-uuid');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('DELIVERED');
    });
  });

  // ==================== E-MUSTAHSIL TESTS ====================

  describe('E-Mustahsil', () => {
    const sampleReceipt: ProducerReceiptRequest = {
      ProducerReceipt: {
        ReceiptId: 'MUS2024000001',
        ProfileId: 'TEMELMUSTAHSILMAKBUZU',
        IssueDate: '2024-01-01',
        CurrencyId: 'TRY',
        SupplierParty: {
          PartyIdentification: '1234567890',
          PartyName: 'Test Supplier',
        },
        CustomerParty: {
          PartyIdentification: '12345678901',
          PartyName: 'Test Producer',
          Person: { FirstName: 'Mehmet', FamilyName: 'Ciftci' },
        },
        DocumentLines: [
          {
            ItemCode: 'URUN-001',
            ItemName: 'Bugday',
            InvoicedQuantity: 1000,
            IsoUnitCode: 'KGM',
            Price: 10,
          },
        ],
        LegalMonetaryTotal: {
          LineExtensionAmount: 10000,
          PayableAmount: 10000,
        },
      },
    };

    it('should send producer receipt', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { uuid: 'receipt-uuid', invoiceNumber: 'MUS2024000001' },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendProducerReceipt(sampleReceipt);

      expect(result.success).toBe(true);
      expect(result.data?.uuid).toBe('receipt-uuid');
    });

    it('should send batch producer receipts', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { uuid: 'receipt-uuid-1' },
            { uuid: 'receipt-uuid-2' },
          ],
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendProducerReceipts([sampleReceipt, sampleReceipt]);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should get producer receipt status', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: { uuid: 'receipt-uuid', status: 'SENT' },
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getProducerReceiptStatus('receipt-uuid');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('SENT');
    });
  });

  // ==================== DOVIZ KURU TESTS ====================

  describe('Exchange Rate', () => {
    it('should get exchange rate for specific currency', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            currency: 'USD',
            buyingRate: 32.5,
            sellingRate: 32.7,
            effectiveRate: 32.6,
            date: '2024-01-01',
          },
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getExchangeRate('USD', '2024-01-01');

      expect(result.success).toBe(true);
      expect(result.data?.currency).toBe('USD');
      expect(result.data?.effectiveRate).toBe(32.6);
    });

    it('should get all exchange rates', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [
            { currency: 'USD', effectiveRate: 32.6 },
            { currency: 'EUR', effectiveRate: 35.2 },
            { currency: 'GBP', effectiveRate: 41.1 },
          ],
        },
      };
      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getAllExchangeRates('2024-01-01');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
    });
  });

  // ==================== ERROR HANDLING TESTS ====================

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Network Error'));

      await expect(client.authenticate({
        partyId: '123',
        username: 'test',
        password: 'test',
      })).rejects.toThrow('Network Error');
    });

    it('should handle API errors with status codes', async () => {
      const error = {
        response: {
          status: 500,
          data: { success: false, message: 'Internal Server Error' },
        },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(client.checkEInvoiceUser('123')).rejects.toEqual(error);
    });

    it('should handle 401 unauthorized', async () => {
      const error = {
        response: {
          status: 401,
          data: { success: false, message: 'Token expired' },
        },
      };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.getInvoiceStatus('uuid')).rejects.toEqual(error);
    });
  });

  // ==================== TOKEN MANAGEMENT TESTS ====================

  describe('Token Management', () => {
    it('should include token in POST requests after authentication', async () => {
      // Authenticate first
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { success: true, data: { token: 'my-token' } },
      });

      await client.authenticate({
        partyId: '123',
        username: 'test',
        password: 'test',
      });

      // Make another request
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { success: true, data: { isActive: true } },
      });

      await client.checkEInvoiceUser('456');

      expect(mockAxiosInstance.post).toHaveBeenLastCalledWith(
        '/invoice/user/456',
        expect.objectContaining({ EtsToken: 'my-token' })
      );
    });

    it('should include token in GET requests', async () => {
      client.setToken('my-token');

      mockAxiosInstance.get.mockResolvedValueOnce({
        data: { success: true, data: { status: 'APPROVED' } },
      });

      await client.getInvoiceStatus('test-uuid');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('EtsToken=my-token')
      );
    });
  });

  // ==================== CONFIG TESTS ====================

  describe('Client Configuration', () => {
    it('should use default config values', () => {
      const defaultClient = new EtsClient();
      expect(defaultClient.getToken()).toBeNull();
    });

    it('should use custom config values', () => {
      const customClient = new EtsClient({
        baseUrl: 'https://custom.api.com',
        integrator: 'IZI',
        softwareId: 'CUSTOM-APP',
      });

      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: { token: 'token' } },
      });

      // Config is used internally, just verify client was created
      expect(customClient).toBeDefined();
    });
  });
});
