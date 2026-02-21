# Entegre ETS SDK

Türkiye'deki e-belge entegratörlerini tek bir API üzerinden yönetmenizi sağlayan **Entegre ETS** platformu için resmi SDK örnekleri.

## Hızlı Başlangıç

### 1. Token Al

```bash
curl -X POST https://ets-test.bulutix.com/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "PartyIdentificationId": "1234567890",
    "Username": "kullanici",
    "Password": "sifre",
    "SoftwareId": "MY-APP",
    "Integrator": "UYM"
  }'
```

### 2. Fatura Gönder

```bash
curl -X POST https://ets-test.bulutix.com/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "EtsToken": "...",
    "Invoice": { ... },
    "TargetCustomer": { "Alias": "urn:mail:defaultpk@vkn" }
  }'
```

## SDK'lar

| Dil | Dizin | Gereksinimler |
|-----|-------|---------------|
| C# | [`csharp/`](./csharp) | .NET 8.0+ |
| Python | [`python/`](./python) | Python 3.8+ |
| TypeScript | [`typescript/`](./typescript) | Node.js 18+ |
| JavaScript | [`javascript/`](./javascript) | Node.js 18+ |
| Java | [`java/`](./java) | Java 17+, Maven |
| PHP | [`php/`](./php) | PHP 8.1+, Composer |
| Ruby | [`ruby/`](./ruby) | Ruby 3.0+ |
| Delphi | [`delphi/`](./delphi) | Delphi 10.4+ |

## API Ortamları

| Ortam | URL |
|-------|-----|
| **Test** | `https://ets-test.bulutix.com` |
| **Production** | `https://ets.bulutix.com` |

## Desteklenen Entegratörler

| Kod | Entegratör | Açıklama |
|-----|------------|----------|
| `UYM` | Uyumsoft | Standart kurumsal |
| `UYK` | Uyumsoft Kurumsal | Büyük ölçekli işletmeler |
| `IZI` | İzibiz | - |
| `DGN` | Doğan E-Dönüşüm | - |
| `MYS` | Mysoft | - |

## API Endpointleri

### E-Fatura

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/invoice` | Fatura gönder |
| `POST` | `/invoice/draft` | Taslak fatura |
| `POST` | `/invoice/batch` | Toplu gönderim |
| `GET` | `/invoice/{uuid}/status` | Durum sorgula |
| `POST` | `/invoice/{uuid}/respond` | Kabul / Red |
| `POST` | `/invoice/user/{vkn}` | Mükellef sorgula |
| `POST` | `/invoice/user/{vkn}/alias` | Alias listesi |
| `POST` | `/invoice/inbox` | Gelen faturalar |

### E-Arşiv

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/earchive` | E-Arşiv fatura gönder |
| `GET` | `/earchive/{uuid}/status` | Durum sorgula |
| `GET` | `/earchive/{uuid}/pdf` | PDF indir |
| `POST` | `/earchive/{uuid}/cancel` | İptal et |

### E-İrsaliye

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/dispatch` | İrsaliye gönder |
| `GET` | `/dispatch/{uuid}/status` | Durum sorgula |
| `POST` | `/dispatch/user/{vkn}` | Mükellef sorgula |

### Diğer Belgeler

| Belge Türü | Gönderim | Durum |
|------------|----------|-------|
| Müstahsil Makbuzu | `POST /producer-receipt` | `GET /producer-receipt/{uuid}/status` |
| E-SMM | `POST /voucher` | `GET /voucher/{uuid}/status` |
| E-Defter | `POST /ledger` | `GET /ledger/{uuid}/status` |

### Yardımcı Servisler

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `GET` | `/currency/rate?currency=USD&date=2024-01-15` | Döviz kuru |
| `GET` | `/currency/rates?date=2024-01-15` | Tüm kurlar |

## Örnek Kullanım

### Python

```python
from ets_client import EtsClient, EntegreId

client = EtsClient("https://ets-test.bulutix.com")

client.authenticate(EntegreId(
    PartyIdentificationId="1234567890",
    Username="kullanici",
    Password="sifre",
    SoftwareId="MY-APP",
    Integrator="UYM"
))

# Mükellef sorgula
is_active = client.check_einvoice_user("9876543210")

# Fatura gönder
result = client.send_invoice(invoice)
print(f"UUID: {result['Uuid']}")
```

### C#

```csharp
using var client = new EtsClient("https://ets-test.bulutix.com");

await client.AuthenticateAsync(new EntegreId
{
    PartyIdentificationId = "1234567890",
    Username = "kullanici",
    Password = "sifre",
    SoftwareId = "MY-APP",
    Integrator = "UYM"
});

var result = await client.SendInvoiceAsync(invoice);
Console.WriteLine($"UUID: {result.Uuid}");
```

### TypeScript

```typescript
const client = new EtsClient('https://ets-test.bulutix.com');

await client.authenticate({
  PartyIdentificationId: '1234567890',
  Username: 'kullanici',
  Password: 'sifre',
  SoftwareId: 'MY-APP',
  Integrator: 'UYM',
});

const result = await client.sendInvoice(invoice);
console.log(`UUID: ${result.Uuid}`);
```

## Dokümantasyon

Detaylı API dokümantasyonu için [`docs/API-REFERENCE.md`](./docs/API-REFERENCE.md) dosyasına bakınız.

## Lisans

MIT
