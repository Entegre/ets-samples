# Entegre ETS - PHP Client

PHP 8.1+ ile Entegre ETS API entegrasyonu.

## Kurulum

```bash
composer install
```

## Çalıştırma

```bash
php src/index.php
```

## Kullanım

```php
use Entegre\Ets\EtsClient;

$client = new EtsClient('https://ets-test.bulutix.com');

// Kimlik doğrulama
$client->authenticate([
    'PartyIdentificationId' => '1234567890',
    'Username' => 'kullanici',
    'Password' => 'sifre',
    'SoftwareId' => 'MY-APP',
    'Integrator' => 'UYM', // UYM, UYK, IZI, DGN, MYS
]);

// E-Fatura mükellefi sorgula
$isActive = $client->checkEInvoiceUser('9876543210');

// Fatura gönder
$result = $client->sendInvoice([
    'Invoice' => [
        'InvoiceTypeCode' => 'SATIS',
        'ProfileId' => 'TEMELFATURA',
        'IssueDate' => date('Y-m-d'),
        // ... diğer alanlar
    ],
    'TargetCustomer' => ['Alias' => 'urn:mail:defaultpk@alici'],
]);

echo "UUID: {$result['Uuid']}";
```

## API Metodları

### Kimlik Doğrulama
- `authenticate(array)` - Token al

### E-Fatura
- `checkEInvoiceUser(partyId)` - Mükellef sorgula
- `getUserAliases(partyId)` - Alias listesi
- `sendInvoice(invoice)` - Fatura gönder
- `sendDraftInvoice(invoice)` - Taslak gönder
- `getInvoiceStatus(uuid)` - Durum sorgula
- `respondInvoice(uuid, responseType, description)` - Kabul/Red

### E-Arşiv
- `sendEArchive(invoice, sendType)` - E-Arşiv gönder
- `getEArchiveStatus(uuid)` - Durum sorgula
- `cancelEArchive(uuid)` - İptal et

### Döviz Kuru
- `getExchangeRate(currency, date)` - Kur sorgula
