# Entegre ETS - C# Client

C# (.NET 8.0) ile Entegre ETS API entegrasyonu.

## Kurulum

```bash
cd EtsSamples
dotnet restore
dotnet build
```

## Çalıştırma

```bash
dotnet run
```

## Kullanım

```csharp
using Entegre.Ets.Samples;

using var client = new EtsClient("https://ets-test.bulutix.com");

// Kimlik doğrulama
await client.AuthenticateAsync(new EntegreId
{
    PartyIdentificationId = "1234567890",
    Username = "kullanici",
    Password = "sifre",
    SoftwareId = "MY-APP",
    Integrator = "UYM"  // UYM, UYK, IZI, DGN, MYS
});

// E-Fatura mükellefi sorgula
var isActive = await client.CheckEInvoiceUserAsync("9876543210");

// Fatura gönder
var invoice = new InvoiceModel
{
    Invoice = new Invoice
    {
        InvoiceTypeCode = "SATIS",
        ProfileId = "TEMELFATURA",
        IssueDate = DateTime.Today.ToString("yyyy-MM-dd"),
        // ... diğer alanlar
    },
    TargetCustomer = new TargetCustomer { Alias = "urn:mail:defaultpk@alici" }
};

var result = await client.SendInvoiceAsync(invoice);
Console.WriteLine($"UUID: {result.Uuid}");
```

## API Metodları

### Kimlik Doğrulama
- `AuthenticateAsync(EntegreId)` - Token al

### E-Fatura
- `CheckEInvoiceUserAsync(partyId)` - Mükellef sorgula
- `GetUserAliasesAsync(partyId)` - Alias listesi
- `SendInvoiceAsync(invoice)` - Fatura gönder
- `SendDraftInvoiceAsync(invoice)` - Taslak gönder
- `GetInvoiceStatusAsync(uuid)` - Durum sorgula
- `RespondInvoiceAsync(uuid, responseType)` - Kabul/Red
- `GetInboxInvoicesAsync(startDate, endDate)` - Gelen faturalar

### E-Arşiv
- `SendEArchiveAsync(invoice, sendType)` - E-Arşiv gönder
- `GetEArchiveStatusAsync(uuid)` - Durum sorgula
- `CancelEArchiveAsync(uuid)` - İptal et

### E-İrsaliye
- `CheckEDispatchUserAsync(partyId)` - Mükellef sorgula
- `SendDispatchAsync(dispatch)` - İrsaliye gönder
- `GetDispatchStatusAsync(uuid)` - Durum sorgula

### Döviz Kuru
- `GetExchangeRateAsync(currency, date)` - Kur sorgula
