# Entegre ETS API Test Raporu

Bu dokümanda ETS API'sinin test edilmesi sırasında kullanılan metodlar, gönderilen istekler ve alınan yanıtlar detaylı olarak açıklanmaktadır.

## Test Ortamı

| Parametre | Değer |
|-----------|-------|
| API URL | `https://ets.bulutix.com` (Production) |
| Entegratör | UYM (Uyumsoft) |
| Test Tarihi | 2026-02-28 |

---

## 1. Authentication (Kimlik Doğrulama)

### Endpoint
```
POST /auth/token
```

### Request
```json
{
  "PartyIdentificationId": "1234567890",
  "Username": "kullanici_adi",
  "Password": "sifre",
  "SoftwareId": "UYGULAMA-ID",
  "Integrator": "UYM"
}
```

### Başarılı Response
```json
{
  "data": {
    "token": "gR3TKeBeHNRmWiWszSbwyj2gpkKSL/JVAJXr/v57QViUO2P2pBjxauOhQO/oR72k..."
  },
  "message": "OK",
  "success": true
}
```

### Notlar
- Token, sonraki tüm isteklerde `EtsToken` olarak body'de gönderilmelidir
- Token şifrelenmiş EntegreId bilgilerini içerir

---

## 2. E-Fatura Mükellef Sorgulama

### Endpoint
```
POST /invoice/user/{vkn}
```

### Request
```json
{
  "EtsToken": "gR3TKeBeHNRmWiWszSbwyj2gpkKSL/JV..."
}
```

### Başarılı Response (Mükellef Değil)
```json
{
  "data": {
    "partyId": "12345678901",
    "isActive": false
  },
  "message": null,
  "success": true
}
```

### Başarılı Response (Mükellef)
```json
{
  "data": {
    "partyId": "1234567890",
    "isActive": true
  },
  "message": null,
  "success": true
}
```

### Notlar
- `isActive: false` ise bu kişiye E-Fatura gönderilemez, E-Arşiv kullanılmalıdır
- VKN 10 haneli, TCKN 11 hanelidir

---

## 3. Alias (Posta Kutusu) Sorgulama

### Endpoint
```
POST /invoice/user/{vkn}/alias
```

### Request
```json
{
  "EtsToken": "gR3TKeBeHNRmWiWszSbwyj2gpkKSL/JV..."
}
```

### Başarılı Response
```json
{
  "data": {
    "partyIdentificationId": "1234567890",
    "title": "ÖRNEK TEKNOLOJİ A.Ş.",
    "type": "OZEL",
    "registerTime": "2016-03-31T14:56:43",
    "senderboxAliases": [
      {
        "alias": "urn:mail:defaultgb@ornek.com.tr",
        "creationTime": "2016-03-31T14:56:43"
      }
    ],
    "receiverboxAliases": [
      {
        "alias": "urn:mail:defaultpk@ornek.com.tr",
        "creationTime": "2016-03-31T14:56:43"
      }
    ]
  },
  "message": null,
  "success": true
}
```

### Notlar
- `senderboxAliases`: Gönderici kutusu (GB) - Fatura gönderirken kullanılır
- `receiverboxAliases`: Alıcı kutusu (PK) - Fatura alırken kullanılır
- `type`: OZEL (Özel sektör) veya KAMU (Kamu kurumu)

---

## 4. E-Arşiv Fatura Gönderimi

### Endpoint
```
POST /earchive
```

### Request
```json
{
  "EtsToken": "gR3TKeBeHNRmWiWszSbwyj2gpkKSL/JV...",
  "Invoice": {
    "IsDraft": true,
    "InvoiceId": "ENT2026000000010",
    "InvoiceTypeCode": "SATIS",
    "ProfileId": "EARSIVFATURA",
    "IssueDate": "2026-02-28",
    "DocumentCurrencyCode": "TRY",
    "CurrencyId": "TRY",
    "Notes": [
      "Bu bir test faturasıdır.",
      "ETS API entegrasyon testi."
    ],
    "SupplierParty": {
      "PartyIdentification": "1234567890",
      "PartyName": "Örnek Teknoloji A.Ş.",
      "PartyTaxScheme": "ANKARA VD",
      "Alias": "urn:mail:defaultgb@ornek.com.tr",
      "Address": {
        "Country": "Türkiye",
        "CityName": "Ankara",
        "CitySubdivisionName": "Çankaya",
        "DistrictName": "Çankaya",
        "StreetName": "Atatürk Bulvarı No:100",
        "BuildingNumber": "100",
        "PostalZone": "06690"
      }
    },
    "CustomerParty": {
      "PartyIdentification": "12345678901",
      "PartyName": "Ahmet Yılmaz",
      "PartyTaxScheme": "",
      "Address": {
        "Country": "Türkiye",
        "CityName": "İstanbul",
        "CitySubdivisionName": "Kadıköy",
        "DistrictName": "Kadıköy",
        "StreetName": "Bağdat Caddesi No:50",
        "BuildingNumber": "50",
        "PostalZone": "34710"
      },
      "Person": {
        "FirstName": "Ahmet",
        "FamilyName": "Yılmaz"
      }
    },
    "DocumentLines": [
      {
        "ItemCode": "URN-001",
        "ItemName": "Yazılım Lisansı",
        "InvoicedQuantity": 1,
        "IsoUnitCode": "C62",
        "CurrencyId": "TRY",
        "Price": 1000,
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
      "TaxIncludedAmount": 1200,
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
    "PartyName": "Ahmet Yılmaz",
    "PartyIdentification": "12345678901",
    "Alias": "urn:mail:defaultpk@12345678901"
  },
  "ArchiveInfo": {
    "SendingType": "ELEKTRONIK",
    "IsInternetSales": false
  }
}
```

### Başarılı Response
```json
{
  "data": {
    "uuid": "b7e99f39-aaf3-4393-a4bd-a16e343f4ecb",
    "invoiceNumber": "ENT2026000000010",
    "message": null,
    "code": null
  },
  "message": null,
  "success": true
}
```

### Önemli Alanlar

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| `InvoiceId` | Evet | Fatura numarası (benzersiz olmalı) |
| `ProfileId` | Evet | E-Arşiv için `EARSIVFATURA` |
| `CurrencyId` | Evet | Para birimi kodu (TRY, USD, EUR) |
| `DocumentLines[].CurrencyId` | Evet | Satır para birimi |
| `DocumentLines[].IsoUnitCode` | Evet | UBL birim kodu (C62, KGM, LTR vb.) |
| `Person` | Evet* | TCKN (bireysel) müşteriler için zorunlu |
| `PartyTaxScheme` | Evet | VKN için vergi dairesi, TCKN için boş |

### Sık Karşılaşılan Hatalar

| Hata Kodu | Mesaj | Çözüm |
|-----------|-------|-------|
| 11603 | Fatura numarası daha önce kullanılmış | Yeni bir fatura numarası kullanın |
| 11101 | currencyID eksik | `CurrencyId` alanını ekleyin |
| 11204 | unitCode (Birim) alanında geçersiz değer | UBL birim kodu kullanın (örn: `C62` adet için, `ADET` değil) |
| 11221 | TaxExemptionReason dolu ise TaxExemptionReasonCode da dolu olmalı | İstisna/muafiyet yoksa bu alanları boş bırakın |
| - | Fatura alıcısını en az iki karakter belirtiniz | `Person.FirstName` ve `Person.FamilyName` ekleyin |

---

## 5. E-Fatura Gönderimi (Taslak)

### Endpoint
```
POST /invoice/draft
```

### Request
E-Arşiv ile aynı yapıda, farklılıklar:

```json
{
  "Invoice": {
    "ProfileId": "TEMELFATURA",
    ...
  },
  "TargetCustomer": {
    "Alias": "urn:mail:defaultpk@alici-vkn"
  }
}
```

### Notlar
- E-Fatura sadece `isActive: true` olan mükelleflere gönderilebilir
- `ProfileId`: `TEMELFATURA` veya `TICARIFATURA`
- `TargetCustomer.Alias`: Alıcının GİB'de kayıtlı alias'ı

---

## Fatura Türleri (ProfileId)

| ProfileId | Açıklama | Kullanım |
|-----------|----------|----------|
| `TEMELFATURA` | Temel Fatura | Standart e-fatura |
| `TICARIFATURA` | Ticari Fatura | Kabul/red gerektiren fatura |
| `EARSIVFATURA` | E-Arşiv Fatura | E-fatura mükellefi olmayanlara |
| `IHRACAT` | İhracat Faturası | Yurt dışı satışlar |
| `YOLCUBERABERFATURA` | Yolcu Beraber Fatura | Turistik satışlar |

---

## Fatura Tipleri (InvoiceTypeCode)

| Kod | Açıklama |
|-----|----------|
| `SATIS` | Satış Faturası |
| `IADE` | İade Faturası |
| `ISTISNA` | İstisna Faturası |
| `TEVKIFAT` | Tevkifatlı Fatura |
| `IHRACKAYITLI` | İhraç Kayıtlı Fatura |
| `OZELMATRAH` | Özel Matrah Faturası |
| `SGK` | SGK Faturası |

---

## Vergi Kodları

| Kod | Vergi Adı |
|-----|-----------|
| `0015` | KDV |
| `0003` | ÖTV |
| `4171` | Konaklama Vergisi |
| `9015` | Tevkifat KDV |

---

## Birim Kodları (IsoUnitCode)

GİB, UBL-TR standardına uygun UN/ECE Recommendation 20 birim kodlarını kullanmaktadır.

| Kod | Açıklama |
|-----|----------|
| `C62` | Adet (Piece) |
| `KGM` | Kilogram |
| `LTR` | Litre |
| `MTR` | Metre |
| `MTK` | Metrekare |
| `MTQ` | Metreküp |
| `PR` | Çift (Pair) |
| `SET` | Set |
| `KWH` | Kilowatt Saat |
| `DAY` | Gün |
| `MON` | Ay |
| `HUR` | Saat |
| `BX` | Kutu |
| `PA` | Paket |

> **Dikkat:** `ADET`, `PAKET` gibi Türkçe birim kodları GİB tarafından kabul edilmez. UBL standardına uygun kodlar kullanılmalıdır.

---

## TypeScript Örnek Kod

```typescript
import axios from 'axios';

const baseUrl = 'https://ets.bulutix.com';

// 1. Authentication
const authResponse = await axios.post(`${baseUrl}/auth/token`, {
  PartyIdentificationId: '1234567890',
  Username: 'kullanici',
  Password: 'sifre',
  SoftwareId: 'APP-ID',
  Integrator: 'UYM'
});

const etsToken = authResponse.data.data.token;

// 2. Mükellef Kontrolü
const userCheck = await axios.post(
  `${baseUrl}/invoice/user/12345678901`,
  { EtsToken: etsToken }
);

const isEInvoiceUser = userCheck.data.data.isActive;

// 3. E-Arşiv veya E-Fatura Gönderimi
const endpoint = isEInvoiceUser ? '/invoice/draft' : '/earchive';
const profileId = isEInvoiceUser ? 'TEMELFATURA' : 'EARSIVFATURA';

const invoiceResponse = await axios.post(`${baseUrl}${endpoint}`, {
  EtsToken: etsToken,
  Invoice: {
    ProfileId: profileId,
    IsoUnitCode: 'C62', // UBL birim kodu kullanın
    CurrencyId: 'TRY',
    // ... diğer alanlar
  }
});

console.log('UUID:', invoiceResponse.data.data.uuid);
```

---

## Sonuç

Tüm API metodları başarıyla test edilmiştir:

| Metod | Endpoint | Durum |
|-------|----------|-------|
| Authentication | POST /auth/token | ✅ Çalışıyor |
| Mükellef Sorgulama | POST /invoice/user/{vkn} | ✅ Çalışıyor |
| Alias Sorgulama | POST /invoice/user/{vkn}/alias | ✅ Çalışıyor |
| E-Arşiv Gönderimi | POST /earchive | ✅ Çalışıyor |
| E-Fatura Taslak | POST /invoice/draft | ✅ Çalışıyor |

### Test Edilen Fatura

| Alan | Değer |
|------|-------|
| Fatura No | ENT2026000000010 |
| UUID | b7e99f39-aaf3-4393-a4bd-a16e343f4ecb |
| Profil | EARSIVFATURA |
| Tutar | 1000 TRY + 200 TRY KDV = 1200 TRY |
| GİB Durumu | ✅ Başarılı |

---

*Son Güncelleme: 2026-02-28*
