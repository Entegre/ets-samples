# Entegre ETS - Java Client

Java 17+ ile Entegre ETS API entegrasyonu.

## Kurulum

```bash
mvn clean compile
```

## Çalıştırma

```bash
mvn exec:java -Dexec.mainClass="com.entegre.samples.Main"
```

## Kullanım

```java
import com.entegre.samples.EtsClient;

EtsClient client = new EtsClient("https://ets-test.bulutix.com");

// Kimlik doğrulama
client.authenticate(new EtsClient.EntegreId(
    "1234567890",    // VKN
    "kullanici",     // Username
    "sifre",         // Password
    "MY-APP",        // SoftwareId
    "UYM"            // Integrator: UYM, UYK, IZI, DGN, MYS
));

// E-Fatura mükellefi sorgula
boolean isActive = client.checkEInvoiceUser("9876543210");

// Fatura gönder
Map<String, Object> invoice = Map.of(
    "Invoice", Map.of(
        "InvoiceTypeCode", "SATIS",
        "ProfileId", "TEMELFATURA",
        // ... diğer alanlar
    )
);

Map<String, Object> result = client.sendInvoice(invoice);
System.out.println("UUID: " + result.get("Uuid"));
```

## API Metodları

### Kimlik Doğrulama
- `authenticate(EntegreId)` - Token al

### E-Fatura
- `checkEInvoiceUser(partyId)` - Mükellef sorgula
- `getUserAliases(partyId)` - Alias listesi
- `sendInvoice(invoice)` - Fatura gönder
- `getInvoiceStatus(uuid)` - Durum sorgula

### E-Arşiv
- `sendEArchive(invoice, sendType)` - E-Arşiv gönder

### Döviz Kuru
- `getExchangeRate(currency, date)` - Kur sorgula
