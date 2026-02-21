# Entegre ETS - Python Client

Python ile Entegre ETS API entegrasyonu.

## Kurulum

```bash
pip install -r requirements.txt
```

## Kullanım

```python
from ets_client import EtsClient, EntegreId, Invoice, Party, Address, DocumentLine
from datetime import date

# Client oluştur
client = EtsClient("https://ets-test.bulutix.com")

# Kimlik doğrulama
credentials = EntegreId(
    PartyIdentificationId="1234567890",  # VKN
    Username="kullanici",
    Password="sifre",
    SoftwareId="MY-APP",
    Integrator="UYM"  # UYM, UYK, IZI, DGN, MYS
)

client.authenticate(credentials)

# E-Fatura mükellefi sorgula
is_active = client.check_einvoice_user("9876543210")

# Alias listesi al
aliases = client.get_user_aliases("9876543210")

# Fatura gönder
invoice = Invoice(
    InvoiceType="SATIS",
    ProfileId="TEMELFATURA",
    IssueDate=date.today().isoformat(),
    Supplier=Party(
        PartyIdentification="1234567890",
        PartyName="Satıcı Firma",
        TaxOffice="Test VD"
    ),
    Customer=Party(
        PartyIdentification="9876543210",
        PartyName="Alıcı Firma",
        TaxOffice="Test VD"
    ),
    Lines=[
        DocumentLine(
            ItemCode="URUN001",
            ItemName="Ürün Adı",
            InvoicedQuantity=10,
            UnitCode="ADET",
            Price=100.00
        )
    ]
)

result = client.send_invoice(invoice)
print(f"Fatura UUID: {result['Uuid']}")

# Durum sorgula
status = client.get_invoice_status(result['Uuid'])
```

## API Metodları

### Kimlik Doğrulama
- `authenticate(entegre_id)` - Token al

### E-Fatura
- `check_einvoice_user(party_id)` - Mükellef sorgula
- `get_user_aliases(party_id)` - Alias listesi
- `send_invoice(invoice)` - Fatura gönder
- `send_draft_invoice(invoice)` - Taslak gönder
- `get_invoice_status(uuid)` - Durum sorgula
- `respond_invoice(uuid, response_type)` - Kabul/Red
- `get_inbox_invoices(start_date, end_date)` - Gelen faturalar

### E-Arşiv
- `send_earchive(invoice, send_type)` - E-Arşiv gönder
- `get_earchive_status(uuid)` - Durum sorgula
- `get_earchive_pdf(uuid)` - PDF indir
- `cancel_earchive(uuid)` - İptal et

### E-İrsaliye
- `check_edispatch_user(party_id)` - Mükellef sorgula
- `send_dispatch(dispatch_data)` - İrsaliye gönder
- `get_dispatch_status(uuid)` - Durum sorgula

### Döviz Kuru
- `get_exchange_rate(currency, date)` - Kur sorgula
