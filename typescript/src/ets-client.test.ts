/**
 * ETS Client Unit Tests
 * Vitest ile test ediliyor
 *
 * Calistirmak icin: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { EtsClient } from './ets-client';

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

  describe('authenticate', () => {
    it('should authenticate and store token', async () => {
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
    });
  });

  describe('checkEInvoiceUser', () => {
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

  describe('getUserAliases', () => {
    it('should return user aliases', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            partyIdentificationId: '1234567890',
            title: 'Test Company',
            type: 'OZEL',
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
    });
  });

  describe('sendEArchiveInvoice', () => {
    it('should send e-archive invoice successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            uuid: 'test-uuid-123',
            invoiceNumber: 'TEST2024000001',
          },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const invoice = {
        invoiceId: 'TEST2024000001',
        invoiceTypeCode: 'SATIS',
        profileId: 'EARSIVFATURA',
        issueDate: '2024-01-01',
        currencyId: 'TRY',
        supplierParty: {
          partyIdentification: '1234567890',
          partyName: 'Test Supplier',
        },
        customerParty: {
          partyIdentification: '12345678901',
          partyName: 'Test Customer',
          person: {
            firstName: 'Test',
            familyName: 'Customer',
          },
        },
        documentLines: [
          {
            itemCode: 'ITEM-001',
            itemName: 'Test Item',
            quantity: 1,
            unitCode: 'C62',
            price: 100,
            taxes: [{ taxCode: '0015', taxName: 'KDV', percent: 20, amount: 20 }],
          },
        ],
        legalMonetaryTotal: {
          lineExtensionAmount: 100,
          taxIncludedAmount: 120,
          payableAmount: 120,
        },
      };

      const result = await client.sendEArchiveInvoice(invoice);

      expect(result.success).toBe(true);
      expect(result.data?.uuid).toBe('test-uuid-123');
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

      const result = await client.sendEArchiveInvoice({} as any);

      expect(result.success).toBe(false);
      expect(result.message).toContain('11603');
    });
  });

  describe('sendInvoice', () => {
    it('should send e-invoice successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            uuid: 'invoice-uuid-456',
            invoiceNumber: 'INV2024000001',
          },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.sendInvoice({} as any);

      expect(result.success).toBe(true);
      expect(result.data?.uuid).toBe('invoice-uuid-456');
    });
  });

  describe('getExchangeRate', () => {
    it('should get exchange rate for currency', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            currency: 'USD',
            rate: 32.5,
            date: '2024-01-01',
          },
        },
      };
      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await client.getExchangeRate('USD', '2024-01-01');

      expect(result.success).toBe(true);
      expect(result.data?.rate).toBe(32.5);
    });
  });

  describe('error handling', () => {
    it('should handle network errors', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Network Error'));

      await expect(client.authenticate({
        partyId: '123',
        username: 'test',
        password: 'test',
      })).rejects.toThrow('Network Error');
    });

    it('should handle API errors', async () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      };
      mockAxiosInstance.post.mockRejectedValue(error);

      await expect(client.checkEInvoiceUser('123')).rejects.toEqual(error);
    });
  });

  describe('token management', () => {
    it('should include token in subsequent requests', async () => {
      // First authenticate
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { success: true, data: { token: 'my-token' } },
      });

      await client.authenticate({
        partyId: '123',
        username: 'test',
        password: 'test',
      });

      // Then make another request
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { success: true, data: { isActive: true } },
      });

      await client.checkEInvoiceUser('456');

      // Check that token was included
      expect(mockAxiosInstance.post).toHaveBeenLastCalledWith(
        '/invoice/user/456',
        expect.objectContaining({ EtsToken: 'my-token' })
      );
    });
  });
});
