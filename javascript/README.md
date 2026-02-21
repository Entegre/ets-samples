# Entegre ETS - JavaScript Client

Node.js JavaScript ile Entegre ETS API entegrasyonu.

## Kurulum

```bash
npm install
```

## Çalıştırma

```bash
npm start
```

## Kullanım

```javascript
const { EtsClient } = require('./ets-client');

const client = new EtsClient('https://ets-test.bulutix.com');

// Kimlik doğrulama
await client.authenticate({
  PartyIdentificationId: '1234567890',
  Username: 'kullanici',
  Password: 'sifre',
  SoftwareId: 'MY-APP',
  Integrator: 'UYM', // UYM, UYK, IZI, DGN, MYS
});

// E-Fatura mükellefi sorgula
const isActive = await client.checkEInvoiceUser('9876543210');

// Fatura gönder
const result = await client.sendInvoice({
  Invoice: {
    InvoiceTypeCode: 'SATIS',
    ProfileId: 'TEMELFATURA',
    IssueDate: '2024-01-15',
    Supplier: { PartyIdentification: '1234567890', PartyName: 'Satıcı' },
    Customer: { PartyIdentification: '9876543210', PartyName: 'Alıcı' },
    Lines: [{ ItemCode: 'URUN001', ItemName: 'Ürün', InvoicedQuantity: 10, IsoUnitCode: 'ADET', Price: 100 }],
  },
  TargetCustomer: { Alias: 'urn:mail:defaultpk@alici' },
});

console.log(`UUID: ${result.Uuid}`);
```

## API Metodları

### Kimlik Doğrulama
- `authenticate(entegreId)` - Token al

### E-Fatura
- `checkEInvoiceUser(partyId)` - Mükellef sorgula
- `getUserAliases(partyId)` - Alias listesi
- `sendInvoice(invoice)` - Fatura gönder
- `sendDraftInvoice(invoice)` - Taslak gönder
- `getInvoiceStatus(uuid)` - Durum sorgula
- `respondInvoice(uuid, responseType)` - Kabul/Red
- `getInboxInvoices(startDate, endDate)` - Gelen faturalar

### E-Arşiv
- `sendEArchive(invoice, sendType)` - E-Arşiv gönder
- `getEArchiveStatus(uuid)` - Durum sorgula
- `cancelEArchive(uuid)` - İptal et

### E-İrsaliye
- `checkEDispatchUser(partyId)` - Mükellef sorgula

### Döviz Kuru
- `getExchangeRate(currency, date)` - Kur sorgula
