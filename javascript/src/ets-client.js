/**
 * Entegre ETS API Client - JavaScript
 */

const axios = require('axios');

class EtsClient {
  constructor(baseUrl = 'https://ets-test.bulutix.com') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.etsToken = null;
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
  async authenticate(entegreId) {
    const response = await this.client.post('/auth/token', entegreId);

    if (!response.data.Success) {
      throw new Error(`Authentication failed: ${response.data.Message}`);
    }

    this.etsToken = response.data.Data.EtsToken;
    return this.etsToken;
  }

  // ==================== E-FATURA ====================

  /**
   * E-Fatura mukellefi mi sorgular.
   */
  async checkEInvoiceUser(partyId) {
    const result = await this._post(`/invoice/user/${partyId}`);
    return result?.IsActive ?? false;
  }

  /**
   * Kullanici alias listesini getirir.
   */
  async getUserAliases(partyId) {
    const result = await this._post(`/invoice/user/${partyId}/alias`);
    return result?.Aliases ?? [];
  }

  /**
   * E-Fatura gonderir.
   */
  async sendInvoice(invoice) {
    invoice.EtsToken = this.etsToken;
    const result = await this._post('/invoice', invoice);
    return result ?? {};
  }

  /**
   * Taslak fatura gonderir.
   */
  async sendDraftInvoice(invoice) {
    invoice.EtsToken = this.etsToken;
    const result = await this._post('/invoice/draft', invoice);
    return result ?? {};
  }

  /**
   * Fatura durumunu sorgular.
   */
  async getInvoiceStatus(uuid) {
    const result = await this._get(`/invoice/${uuid}/status`);
    return result ?? {};
  }

  /**
   * Faturaya yanit verir (Kabul/Red).
   */
  async respondInvoice(uuid, responseType, description = '') {
    const result = await this._post(`/invoice/${uuid}/respond`, {
      ResponseType: responseType,
      Description: description,
    });
    return result ?? {};
  }

  /**
   * Gelen faturalari listeler.
   */
  async getInboxInvoices(startDate, endDate) {
    const result = await this._post('/invoice/inbox', {
      StartDate: startDate,
      EndDate: endDate,
    });
    return result ?? [];
  }

  // ==================== E-ARSIV ====================

  /**
   * E-Arsiv fatura gonderir.
   */
  async sendEArchive(invoice, sendType = 'KAGIT') {
    invoice.EtsToken = this.etsToken;
    invoice.ArchiveInfo = { SendType: sendType };
    const result = await this._post('/earchive', invoice);
    return result ?? {};
  }

  /**
   * E-Arsiv fatura durumunu sorgular.
   */
  async getEArchiveStatus(uuid) {
    const result = await this._get(`/earchive/${uuid}/status`);
    return result ?? {};
  }

  /**
   * E-Arsiv faturayi iptal eder.
   */
  async cancelEArchive(uuid) {
    const result = await this._post(`/earchive/${uuid}/cancel`);
    return result ?? {};
  }

  // ==================== E-IRSALIYE ====================

  /**
   * E-Irsaliye mukellefi mi sorgular.
   */
  async checkEDispatchUser(partyId) {
    const result = await this._post(`/dispatch/user/${partyId}`);
    return result?.IsActive ?? false;
  }

  // ==================== DOVIZ KURU ====================

  /**
   * Doviz kurunu sorgular.
   */
  async getExchangeRate(currency, date) {
    const result = await this._get(`/currency/rate?currency=${currency}&date=${date}`);
    return result ?? {};
  }

  // ==================== PRIVATE METHODS ====================

  async _get(endpoint) {
    const url = endpoint.includes('?')
      ? `${endpoint}&EtsToken=${this.etsToken}`
      : `${endpoint}?EtsToken=${this.etsToken}`;

    const response = await this.client.get(url);

    if (!response.data.Success) {
      throw new Error(`Request failed: ${response.data.Message}`);
    }

    return response.data.Data;
  }

  async _post(endpoint, data = {}) {
    const requestData = { ...data, EtsToken: this.etsToken };
    const response = await this.client.post(endpoint, requestData);

    if (!response.data.Success) {
      throw new Error(`Request failed: ${response.data.Message}`);
    }

    return response.data.Data;
  }
}

module.exports = { EtsClient };
