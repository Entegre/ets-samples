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
  "Success": true,
  "Data": {
    "EtsToken": "encrypted-token-string..."
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
  "Success": true,
  "Data": {
    "IsActive": true
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
  "Success": true,
  "Data": {
    "Aliases": [
      {
        "Alias": "urn:mail:defaultpk@firma.com.tr",
        "Type": "PK",
        "RegisterDate": "2024-01-01T00:00:00"
      }
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
    "InvoiceTypeCode": "SATIS",
    "ProfileId": "TEMELFATURA",
    "IssueDate": "2024-01-15",
    "DocumentCurrencyCode": "TRY",
    "Notes": ["Fatura notu"],
    "Supplier": {
      "PartyIdentification": "1234567890",
      "PartyName": "Satıcı Firma",
      "TaxOffice": "Test VD",
      "Address": {
        "CityName": "İstanbul",
        "CitySubdivisionName": "Kadıköy",
        "StreetName": "Test Sokak No:1"
      }
    },
    "Customer": {
      "PartyIdentification": "9876543210",
      "PartyName": "Alıcı Firma",
      "TaxOffice": "Test VD"
    },
    "Lines": [
      {
        "ItemCode": "URUN001",
        "ItemName": "Ürün Adı",
        "InvoicedQuantity": 10,
        "IsoUnitCode": "ADET",
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
    "LineExtensionAmount": 1000,
    "TaxExclusiveAmount": 1000,
    "TaxInclusiveAmount": 1200,
    "PayableAmount": 1200,
    "TaxTotal": {
      "TaxAmount": 200,
      "TaxSubtotals": [
        {
          "TaxCode": "0015",
          "TaxName": "KDV",
          "TaxableAmount": 1000,
          "TaxAmount": 200,
          "Percent": 20
        }
      ]
    }
  },
  "TargetCustomer": {
    "Alias": "urn:mail:defaultpk@alici.com.tr"
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

**Yanıt:**
```json
{
  "Success": true,
  "Data": {
    "Uuid": "550e8400-e29b-41d4-a716-446655440000",
    "Number": "ABC2024000000001"
  }
}
```

### Durum Sorgulama

```http
GET /invoice/{uuid}/status?EtsToken=...
```

**Yanıt:**
```json
{
  "Success": true,
  "Data": {
    "Status": "GONDERILDI",
    "StatusCode": "200",
    "StatusDate": "2024-01-15T10:30:00Z"
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

---

## E-Arşiv API

### E-Arşiv Fatura Gönderme

```http
POST /earchive
Content-Type: application/json

{
  "EtsToken": "...",
  "Invoice": { ... },
  "ArchiveInfo": {
    "SendType": "KAGIT"
  }
}
```

**SendType:** `KAGIT` veya `ELEKTRONIK`

### E-Arşiv Durum Sorgulama

```http
GET /earchive/{uuid}/status?EtsToken=...
```

### E-Arşiv PDF İndirme

```http
GET /earchive/{uuid}/pdf?EtsToken=...
```

### E-Arşiv İptal

```http
POST /earchive/{uuid}/cancel
Content-Type: application/json

{
  "EtsToken": "..."
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

### İrsaliye Gönderme

```http
POST /dispatch
Content-Type: application/json

{
  "EtsToken": "...",
  "Dispatch": { ... },
  "TargetCustomer": { "Alias": "..." }
}
```

### Durum Sorgulama

```http
GET /dispatch/{uuid}/status?EtsToken=...
```

---

## Müstahsil Makbuzu API

### Makbuz Gönderme

```http
POST /producer-receipt
Content-Type: application/json

{
  "EtsToken": "...",
  "ProducerReceipt": { ... }
}
```

### Durum Sorgulama

```http
GET /producer-receipt/{uuid}/status?EtsToken=...
```

---

## E-SMM (Serbest Meslek Makbuzu) API

### Makbuz Gönderme

```http
POST /voucher
Content-Type: application/json

{
  "EtsToken": "...",
  "Voucher": { ... }
}
```

### Durum Sorgulama

```http
GET /voucher/{uuid}/status?EtsToken=...
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
  "Success": true,
  "Data": {
    "Currency": "USD",
    "Rate": 30.5432,
    "Date": "2024-01-15"
  }
}
```

### Tüm Kurlar

```http
GET /currency/rates?date=2024-01-15&EtsToken=...
```

---

## Hata Yönetimi

Tüm API yanıtları aşağıdaki formatta döner:

```json
{
  "Success": false,
  "Message": "Hata açıklaması",
  "Data": null
}
```

**HTTP Durum Kodları:**
- `200` - Başarılı
- `400` - Hatalı istek
- `401` - Yetkisiz
- `404` - Bulunamadı
- `500` - Sunucu hatası

---

## Birim Kodları (IsoUnitCode)

| Kod | Birim |
|-----|-------|
| ADET | Adet |
| KG | Kilogram |
| GRM | Gram |
| LT | Litre |
| MT | Metre |
| M2 | Metrekare |
| M3 | Metreküp |
| PAK | Paket |
| KOL | Koli |
| SET | Set |
| TON | Ton |

---

## Vergi Kodları

| Kod | Vergi Türü |
|-----|------------|
| 0015 | KDV |
| 0003 | ÖTV (I) |
| 0071 | ÖTV (II) |
| 0073 | ÖTV (III) |
| 0074 | ÖTV (IV) |
| 4171 | Konaklama vergisi |
| 9015 | Tevkifatlı KDV |
