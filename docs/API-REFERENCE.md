# Entegre ETS API Referansı

## Endpoint'ler

| Ortam | Base URL |
|-------|----------|
| Test | `https://ets-test.bulutix.com` |
| Canlı | `https://ets.bulutix.com` |

## Kimlik Doğrulama

### Token Alma

```http
POST /auth/token
Content-Type: application/json

{
  "PartyIdentificationId": "1234567890",
  "Username": "kullanici",
  "Password": "sifre",
  "SoftwareId": "MY-APP",
  "Integrator": "UYM"
}
```

**Integrator Kodları:**

| Kod | Entegratör |
|-----|------------|
| UYM | Uyumsoft |
| UYK | Uyumsoft Kurumsal |
| IZI | İzibiz |
| DGN | Doğan E-Dönüşüm |
| MYS | Mysoft |

**Yanıt:**
```json
{
  "success": true,
  "data": {
    "token": "encrypted-token-string..."
  }
}
```

---

## E-Fatura API

### Mükellef Sorgulama

```http
POST /invoice/user/{partyId}
Content-Type: application/json

{
  "EtsToken": "..."
}
```

**Yanıt:**
```json
{
  "success": true,
  "data": {
    "partyId": "1234567890",
    "isActive": true
  }
}
```

### Alias Sorgulama

```http
POST /invoice/user/{partyId}/alias
Content-Type: application/json

{
  "EtsToken": "..."
}
```

**Yanıt:**
```json
{
  "success": true,
  "data": {
    "partyIdentificationId": "1234567890",
    "title": "Firma Adı",
    "type": "KURUMSAL",
    "registerTime": "2020-01-15T10:30:00",
    "senderboxAliases": [
      { "alias": "urn:mail:defaultgb@1234567890", "creationTime": "2020-01-15" }
    ],
    "receiverboxAliases": [
      { "alias": "urn:mail:defaultpk@1234567890", "creationTime": "2020-01-15" }
    ]
  }
}
```

### Fatura Gönderme

```http
POST /invoice
Content-Type: application/json

{
  "EtsToken": "...",
  "Invoice": {
    "IsDraft": false,
    "InvoiceId": "ABC2024000000001",
    "InvoiceTypeCode": "SATIS",
    "ProfileId": "TEMELFATURA",
    "IssueDate": "2024-01-15",
    "DocumentCurrencyCode": "TRY",
    "CurrencyId": "TRY",
    "Notes": ["Fatura notu"],
    "SupplierParty": {
      "PartyIdentification": "1234567890",
      "PartyName": "Satıcı Firma",
      "PartyTaxScheme": "Test VD",
      "Alias": "urn:mail:defaultgb@1234567890",
      "Address": {
        "Country": "Türkiye",
        "CityName": "İstanbul",
        "CitySubdivisionName": "Kadıköy",
        "DistrictName": "Merkez",
        "StreetName": "Test Sokak No:1",
        "BuildingNumber": "1",
        "PostalZone": "34710"
      }
    },
    "CustomerParty": {
      "PartyIdentification": "9876543210",
      "PartyName": "Alıcı Firma",
      "PartyTaxScheme": "Test VD",
      "Address": {
        "Country": "Türkiye",
        "CityName": "Ankara",
        "CitySubdivisionName": "Çankaya",
        "StreetName": "Alıcı Sokak No:2",
        "BuildingNumber": "2",
        "PostalZone": "06690"
      },
      "Person": {
        "FirstName": "Ahmet",
        "FamilyName": "Yılmaz"
      }
    },
    "DocumentLines": [
      {
        "ItemCode": "URUN001",
        "ItemName": "Ürün Adı",
        "Description": "Ürün açıklaması",
        "InvoicedQuantity": 10,
        "IsoUnitCode": "C62",
        "CurrencyId": "TRY",
        "Price": 100,
        "LineExtensionAmount": 1000,
        "Taxes": [
          {
            "TaxCode": "0015",
            "TaxName": "KDV",
            "Percent": 20,
            "TaxAmount": 200
          }
        ]
      }
    ],
    "LegalMonetaryTotal": {
      "LineExtensionAmount": 1000,
      "TaxExclusiveAmount": 1000,
      "TaxInclusiveAmount": 1200,
      "AllowanceTotalAmount": 0,
      "PayableAmount": 1200
    },
    "TaxTotals": [
      {
        "TaxCode": "0015",
        "TaxName": "KDV",
        "Percent": 20,
        "TaxAmount": 200
      }
    ]
  },
  "TargetCustomer": {
    "PartyName": "Alıcı Firma",
    "PartyIdentification": "9876543210",
    "Alias": "urn:mail:defaultpk@9876543210"
  }
}
```

**InvoiceTypeCode Değerleri:**
- `SATIS` - Satış faturası
- `IADE` - İade faturası
- `ISTISNA` - İstisna faturası
- `TEVKIFAT` - Tevkifatlı fatura
- `IHRACKAYITLI` - İhraç kayıtlı fatura
- `OZELMATRAH` - Özel matrah faturası

**ProfileId Değerleri:**
- `TEMELFATURA` - Temel fatura
- `TICARIFATURA` - Ticari fatura
- `YOLCUBERABERFATURA` - Yolcu beraberi fatura
- `IHRACAT` - İhracat faturası
- `EARSIVFATURA` - E-Arşiv fatura

**Yanıt:**
```json
{
  "success": true,
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "invoiceNumber": "ABC2024000000001",
    "message": "Fatura başarıyla gönderildi"
  }
}
```

### Taslak Fatura Gönderme

```http
POST /invoice/draft
Content-Type: application/json

{
  "EtsToken": "...",
  "Invoice": { ... }
}
```

Taslak faturalar `IsDraft: true` ile gönderilir ve GİB'e iletilmeden önce düzenlenebilir.

### Durum Sorgulama

```http
GET /invoice/{uuid}/status?EtsToken=...
```

**Yanıt:**
```json
{
  "success": true,
  "data": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "invoiceNumber": "ABC2024000000001",
    "status": "BASARILI",
    "statusDescription": "Fatura başarıyla işlendi"
  }
}
```

**Durum Kodları:**

| Kod | Durum | Açıklama |
|-----|-------|----------|
| 0 | NotPrepared | Hazırlanmadı |
| 1 | NotSent | Gönderilmedi |
| 2 | Draft | Taslak |
| 3 | Cancelled | İptal edildi |
| 4 | Queued | Kuyrukta |
| 5 | Processing | İşleniyor |
| 6 | SentToGib | GİB'e gönderildi |
| 7 | Approved | Onaylandı |
| 8 | WaitingForApprovement | Onay bekliyor |
| 9 | Declined | Reddedildi |
| 10 | Return | İade |
| 11 | EArchiveCancelled | E-Arşiv iptal |
| 12 | Error | Hata |
| 13 | Pending | Beklemede |

### Fatura Yanıt (Kabul/Red)

```http
POST /invoice/{uuid}/respond
Content-Type: application/json

{
  "EtsToken": "...",
  "ResponseType": "KABUL",
  "Description": "Fatura kabul edildi"
}
```

**ResponseType:** `KABUL` veya `RED`

### Gelen Fatura Listesi

```http
POST /invoice/inbox
Content-Type: application/json

{
  "EtsToken": "...",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "pageIndex": 0,
  "pageSize": 50
}
```

**Yanıt:**
```json
{
  "success": true,
  "data": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "invoiceNumber": "ABC2024000000001",
      "issueDate": "2024-01-15",
      "customerName": "Alıcı Firma",
      "customerTaxId": "9876543210",
      "payableAmount": 1200,
      "currencyCode": "TRY",
      "status": "BASARILI"
    }
  ]
}
```

### PDF İndirme

```http
GET /invoice/{uuid}/pdf?EtsToken=...
```

**Yanıt:**
```json
{
  "success": true,
  "data": {
    "pdfContent": "JVBERi0xLjcKCjEgMCBvYmo...",
    "fileName": "ABC2024000000001.pdf"
  }
}
```

`pdfContent` Base64 encoded PDF içeriğidir.

---

## E-Arşiv API

### E-Arşiv Fatura Gönderme

```http
POST /earchive
Content-Type: application/json

{
  "EtsToken": "...",
  "Invoice": { ... },
  "TargetCustomer": { ... },
  "ArchiveInfo": {
    "SendingType": "ELEKTRONIK",
    "IsInternetSales": false
  }
}
```

**SendingType:**
- `ELEKTRONIK` - E-posta ile gönderim
- `KAGIT` - Kağıt çıktı

### Toplu E-Arşiv Fatura Gönderme

```http
POST /earchive/batch
Content-Type: application/json

{
  "EtsToken": "...",
  "Invoices": [
    { /* InvoiceRequest */ },
    { /* InvoiceRequest */ }
  ]
}
```

### E-Arşiv Durum Sorgulama

```http
GET /earchive/{uuid}/status?EtsToken=...
```

### E-Arşiv İptal

```http
POST /earchive/{uuid}/cancel
Content-Type: application/json

{
  "EtsToken": "...",
  "CancelDate": "2024-01-20"
}
```

### E-Arşiv PDF İndirme

```http
GET /earchive/{uuid}/pdf?EtsToken=...
```

### E-Arşiv Fatura Listesi

```http
POST /earchive/list
Content-Type: application/json

{
  "EtsToken": "...",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "pageIndex": 0,
  "pageSize": 50
}
```

---

## E-İrsaliye API

### Mükellef Sorgulama

```http
POST /dispatch/user/{partyId}
Content-Type: application/json

{
  "EtsToken": "..."
}
```

### Alias Sorgulama

```http
POST /dispatch/user/{partyId}/alias
Content-Type: application/json

{
  "EtsToken": "..."
}
```

### İrsaliye Gönderme

```http
POST /dispatch
Content-Type: application/json

{
  "EtsToken": "...",
  "Dispatch": {
    "DispatchId": "IRS2024000000001",
    "ProfileId": "TEMELIRSALIYE",
    "IssueDate": "2024-01-15",
    "DispatchTypeCode": "SEVK",
    "CurrencyId": "TRY",
    "Notes": ["İrsaliye notu"],
    "SupplierParty": { /* Party */ },
    "CustomerParty": { /* Party */ },
    "DocumentLines": [ /* DocumentLine[] */ ]
  },
  "TargetCustomer": {
    "PartyName": "Alıcı Firma",
    "PartyIdentification": "9876543210",
    "Alias": "urn:mail:defaultpk@9876543210"
  }
}
```

### Taslak İrsaliye Gönderme

```http
POST /dispatch/draft
Content-Type: application/json

{
  "EtsToken": "...",
  "Dispatch": { ... }
}
```

### İrsaliye Durum Sorgulama

```http
GET /dispatch/{uuid}/status?EtsToken=...
```

---

## E-Müstahsil Makbuzu API

### Makbuz Gönderme

```http
POST /producer
Content-Type: application/json

{
  "EtsToken": "...",
  "ProducerReceipt": {
    "ReceiptId": "MM2024000000001",
    "ProfileId": "TEMELMUSTAHSILMAKBUZ",
    "IssueDate": "2024-01-15",
    "CurrencyId": "TRY",
    "Notes": ["Makbuz notu"],
    "SupplierParty": { /* Party */ },
    "CustomerParty": { /* Party */ },
    "DocumentLines": [ /* DocumentLine[] */ ],
    "LegalMonetaryTotal": {
      "LineExtensionAmount": 1000,
      "TaxExclusiveAmount": 1000,
      "TaxInclusiveAmount": 1200,
      "AllowanceTotalAmount": 0,
      "PayableAmount": 1200
    }
  }
}
```

### Toplu Makbuz Gönderme

```http
POST /producer/batch
Content-Type: application/json

{
  "EtsToken": "...",
  "Receipts": [
    { /* ProducerReceiptRequest */ },
    { /* ProducerReceiptRequest */ }
  ]
}
```

### Makbuz Durum Sorgulama

```http
GET /producer/{uuid}/status?EtsToken=...
```

---

## Döviz Kuru API

### Kur Sorgulama

```http
GET /currency/rate?currency=USD&date=2024-01-15&EtsToken=...
```

**Yanıt:**
```json
{
  "success": true,
  "data": {
    "currency": "USD",
    "buyingRate": 32.50,
    "sellingRate": 32.75,
    "effectiveRate": 32.625,
    "date": "2024-01-15"
  }
}
```

### Tüm Kurlar

```http
GET /currency/rates?date=2024-01-15&EtsToken=...
```

**Yanıt:**
```json
{
  "success": true,
  "data": [
    { "currency": "USD", "buyingRate": 32.50, "sellingRate": 32.75, "effectiveRate": 32.625, "date": "2024-01-15" },
    { "currency": "EUR", "buyingRate": 35.20, "sellingRate": 35.50, "effectiveRate": 35.35, "date": "2024-01-15" },
    { "currency": "GBP", "buyingRate": 41.00, "sellingRate": 41.40, "effectiveRate": 41.20, "date": "2024-01-15" }
  ]
}
```

---

## Hata Yönetimi

Tüm API yanıtları aşağıdaki formatta döner:

**Başarılı:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Hatalı:**
```json
{
  "success": false,
  "message": "Hata açıklaması",
  "data": null
}
```

**HTTP Durum Kodları:**
- `200` - Başarılı
- `400` - Hatalı istek
- `401` - Yetkisiz
- `404` - Bulunamadı
- `500` - Sunucu hatası

### GİB Hata Kodları

| Kod | Açıklama |
|-----|----------|
| 11204 | Gönderici VKN uyuşmazlığı |
| 11221 | TaxExemptionReason/TaxExemptionReasonCode tutarsızlığı |
| 11603 | Fatura numarası daha önce kullanılmış |

---

## Birim Kodları (IsoUnitCode)

UBL-TR standardına göre UN/ECE Recommendation 20 birim kodları kullanılmalıdır.

| Kod | Birim |
|-----|-------|
| C62 | Adet (birim) |
| KGM | Kilogram |
| GRM | Gram |
| LTR | Litre |
| MTR | Metre |
| MTK | Metrekare |
| MTQ | Metreküp |
| TNE | Ton |
| DAY | Gün |
| HUR | Saat |
| MON | Ay |
| ANN | Yıl |
| KWH | Kilowatt saat |
| PR | Çift |
| SET | Set |
| BX | Kutu |
| CT | Karton |

**Önemli:** `ADET` yerine `C62` kullanılmalıdır. GİB, UBL-TR standardına uygun birim kodları kabul eder.

---

## Vergi Kodları

| Kod | Vergi Türü |
|-----|------------|
| 0015 | KDV |
| 0003 | ÖTV (I) |
| 0071 | ÖTV (II) |
| 0073 | ÖTV (III) |
| 0074 | ÖTV (IV) |
| 0059 | Konaklama Vergisi |
| 4171 | Konaklama vergisi (eski) |
| 9015 | Tevkifatlı KDV |

### Vergi Muafiyet Kodları

Muafiyet durumunda `TaxExemptionReasonCode` ve `TaxExemptionReason` alanları birlikte kullanılmalıdır:

```json
{
  "TaxCode": "0015",
  "TaxName": "KDV",
  "Percent": 0,
  "TaxAmount": 0,
  "ExemptionReasonCode": "325",
  "ExemptionReason": "11/1-a Mal ihracatı"
}
```

**Önemli:** Bu iki alan ya ikisi birden dolu olmalı, ya da ikisi birden boş olmalıdır. Sadece biri dolu olursa GİB hata kodu 11221 döner.

---

## TypeScript Client Kullanımı

```typescript
import { createEtsClient, AuthCredentials, InvoiceRequest } from 'entegre-ets-typescript';

const client = createEtsClient({
  baseUrl: 'https://ets.bulutix.com',
  integrator: 'UYM',
  softwareId: 'MY-APP'
});

// Kimlik doğrulama
const credentials: AuthCredentials = {
  partyId: '1234567890',
  username: 'kullanici',
  password: 'sifre'
};

const authResult = await client.authenticate(credentials);
console.log('Token:', client.getToken());

// Mükellef sorgulama
const userCheck = await client.checkEInvoiceUser('9876543210');
console.log('E-Fatura mükellefi:', userCheck.data?.isActive);

// Alias listesi
const aliases = await client.getUserAliases('9876543210');
console.log('Aliaslar:', aliases.data?.senderboxAliases);

// Fatura gönderme
const request: InvoiceRequest = {
  Invoice: {
    InvoiceTypeCode: 'SATIS',
    ProfileId: 'TEMELFATURA',
    IssueDate: '2024-01-15',
    // ... diğer alanlar
  }
};

const result = await client.sendInvoice(request);
console.log('UUID:', result.data?.uuid);

// Durum sorgulama
const status = await client.getInvoiceStatus(result.data!.uuid!);
console.log('Durum:', status.data?.status);
```

---

## Test Ortamı

Test ortamında çalışmak için:

```bash
# .env dosyası
ETS_BASE_URL=https://ets-test.bulutix.com
ETS_PARTY_ID=test_vkn
ETS_USERNAME=test_user
ETS_PASSWORD=test_pass
```

```typescript
const client = createEtsClient({
  baseUrl: process.env.ETS_BASE_URL
});
```
