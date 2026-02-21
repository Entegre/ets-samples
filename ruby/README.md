# Entegre ETS - Ruby Client

Ruby ile Entegre ETS API entegrasyonu.

## Kurulum

```bash
bundle install
```

## Çalıştırma

```bash
ruby lib/ets_client.rb
```

## Kullanım

```ruby
require_relative 'lib/ets_client'

client = EtsClient.new('https://ets-test.bulutix.com')

# Kimlik doğrulama
client.authenticate({
  'PartyIdentificationId' => '1234567890',
  'Username' => 'kullanici',
  'Password' => 'sifre',
  'SoftwareId' => 'MY-APP',
  'Integrator' => 'UYM'  # UYM, UYK, IZI, DGN, MYS
})

# E-Fatura mükellefi sorgula
is_active = client.check_einvoice_user('9876543210')

# Fatura gönder
result = client.send_invoice({
  'Invoice' => {
    'InvoiceTypeCode' => 'SATIS',
    'ProfileId' => 'TEMELFATURA',
    'IssueDate' => Date.today.to_s,
    # ... diğer alanlar
  },
  'TargetCustomer' => { 'Alias' => 'urn:mail:defaultpk@alici' }
})

puts "UUID: #{result['Uuid']}"
```

## API Metodları

### Kimlik Doğrulama
- `authenticate(hash)` - Token al

### E-Fatura
- `check_einvoice_user(party_id)` - Mükellef sorgula
- `get_user_aliases(party_id)` - Alias listesi
- `send_invoice(invoice)` - Fatura gönder
- `send_draft_invoice(invoice)` - Taslak gönder
- `get_invoice_status(uuid)` - Durum sorgula
- `respond_invoice(uuid, response_type, description)` - Kabul/Red

### E-Arşiv
- `send_earchive(invoice, send_type)` - E-Arşiv gönder
- `get_earchive_status(uuid)` - Durum sorgula
- `cancel_earchive(uuid)` - İptal et

### Döviz Kuru
- `get_exchange_rate(currency, date)` - Kur sorgula
