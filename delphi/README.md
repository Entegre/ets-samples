# Entegre ETS - Delphi Client

Delphi ile Entegre ETS API entegrasyonu.

## Kurulum

1. `EtsSample.dpr` dosyasını Delphi IDE'de açın
2. Project > Build ile derleyin

## Çalıştırma

```bash
EtsSample.exe
```

## Kullanım

```pascal
var
  Client: TEtsClient;
  Token: string;
begin
  Client := TEtsClient.Create('https://ets-test.bulutix.com');
  try
    // Kimlik doğrulama
    Token := Client.Authenticate(
      '1234567890',    // VKN
      'kullanici',     // Username
      'sifre',         // Password
      'MY-APP',        // SoftwareId
      'UYM'            // Integrator: UYM, UYK, IZI, DGN, MYS
    );

    // E-Fatura mükellefi sorgula
    if Client.CheckEInvoiceUser('9876543210') then
      WriteLn('Mükellef aktif');

    // Fatura gönder
    var Invoice := TJSONObject.Create;
    Invoice.AddPair('Invoice', ...);
    Invoice.AddPair('TargetCustomer', ...);

    var Result := Client.SendInvoice(Invoice);
    WriteLn('UUID: ' + Result.GetValue<string>('Uuid'));

  finally
    Client.Free;
  end;
end;
```

## API Metodları

- `Authenticate()` - Token al
- `CheckEInvoiceUser()` - Mükellef sorgula
- `GetUserAliases()` - Alias listesi
- `SendInvoice()` - Fatura gönder
- `GetInvoiceStatus()` - Durum sorgula
- `GetExchangeRate()` - Kur sorgula
