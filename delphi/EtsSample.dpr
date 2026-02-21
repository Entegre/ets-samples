program EtsSample;

{$APPTYPE CONSOLE}

{$R *.res}

uses
  System.SysUtils,
  System.Classes,
  System.Net.HttpClient,
  System.Net.HttpClientComponent,
  System.JSON,
  System.DateUtils;

{
  Entegre ETS API Client - Delphi

  API Endpoints:
    Test: https://ets-test.bulutix.com
    Live: https://ets.bulutix.com
}

const
  BASE_URL = 'https://ets-test.bulutix.com';

type
  TEtsClient = class
  private
    FHttpClient: TNetHTTPClient;
    FBaseUrl: string;
    FEtsToken: string;
    function Get(const Endpoint: string): TJSONObject;
    function Post(const Endpoint: string; Data: TJSONObject = nil): TJSONObject;
  public
    constructor Create(const ABaseUrl: string = BASE_URL);
    destructor Destroy; override;

    function Authenticate(const PartyId, Username, Password, SoftwareId, Integrator: string): string;
    function CheckEInvoiceUser(const PartyId: string): Boolean;
    function GetUserAliases(const PartyId: string): TJSONArray;
    function SendInvoice(Invoice: TJSONObject): TJSONObject;
    function GetInvoiceStatus(const Uuid: string): TJSONObject;
    function GetExchangeRate(const Currency, Date: string): TJSONObject;

    property EtsToken: string read FEtsToken;
  end;

{ TEtsClient }

constructor TEtsClient.Create(const ABaseUrl: string);
begin
  FBaseUrl := ABaseUrl.TrimRight(['/']);
  FHttpClient := TNetHTTPClient.Create(nil);
  FHttpClient.ContentType := 'application/json';
  FHttpClient.Accept := 'application/json';
end;

destructor TEtsClient.Destroy;
begin
  FHttpClient.Free;
  inherited;
end;

function TEtsClient.Authenticate(const PartyId, Username, Password, SoftwareId, Integrator: string): string;
var
  RequestData: TJSONObject;
  Response: IHTTPResponse;
  Result: TJSONObject;
begin
  RequestData := TJSONObject.Create;
  try
    RequestData.AddPair('PartyIdentificationId', PartyId);
    RequestData.AddPair('Username', Username);
    RequestData.AddPair('Password', Password);
    RequestData.AddPair('SoftwareId', SoftwareId);
    RequestData.AddPair('Integrator', Integrator);

    Response := FHttpClient.Post(FBaseUrl + '/auth/token',
      TStringStream.Create(RequestData.ToJSON, TEncoding.UTF8));

    Result := TJSONObject.ParseJSONValue(Response.ContentAsString) as TJSONObject;
    try
      if not Result.GetValue<Boolean>('Success') then
        raise Exception.Create('Authentication failed: ' + Result.GetValue<string>('Message'));

      FEtsToken := Result.GetValue<TJSONObject>('Data').GetValue<string>('EtsToken');
      Self.Result := FEtsToken;
    finally
      Result.Free;
    end;
  finally
    RequestData.Free;
  end;
end;

function TEtsClient.Get(const Endpoint: string): TJSONObject;
var
  Url: string;
  Response: IHTTPResponse;
  JsonResult: TJSONObject;
begin
  if Endpoint.Contains('?') then
    Url := FBaseUrl + Endpoint + '&EtsToken=' + FEtsToken
  else
    Url := FBaseUrl + Endpoint + '?EtsToken=' + FEtsToken;

  Response := FHttpClient.Get(Url);
  JsonResult := TJSONObject.ParseJSONValue(Response.ContentAsString) as TJSONObject;

  if not JsonResult.GetValue<Boolean>('Success') then
  begin
    JsonResult.Free;
    raise Exception.Create('Request failed: ' + JsonResult.GetValue<string>('Message'));
  end;

  Result := JsonResult.GetValue<TJSONObject>('Data').Clone as TJSONObject;
  JsonResult.Free;
end;

function TEtsClient.Post(const Endpoint: string; Data: TJSONObject): TJSONObject;
var
  RequestData: TJSONObject;
  Response: IHTTPResponse;
  JsonResult: TJSONObject;
begin
  if Data <> nil then
    RequestData := Data.Clone as TJSONObject
  else
    RequestData := TJSONObject.Create;

  try
    RequestData.AddPair('EtsToken', FEtsToken);

    Response := FHttpClient.Post(FBaseUrl + Endpoint,
      TStringStream.Create(RequestData.ToJSON, TEncoding.UTF8));

    JsonResult := TJSONObject.ParseJSONValue(Response.ContentAsString) as TJSONObject;

    if not JsonResult.GetValue<Boolean>('Success') then
    begin
      JsonResult.Free;
      raise Exception.Create('Request failed');
    end;

    if JsonResult.FindValue('Data') <> nil then
      Result := JsonResult.GetValue<TJSONObject>('Data').Clone as TJSONObject
    else
      Result := TJSONObject.Create;

    JsonResult.Free;
  finally
    RequestData.Free;
  end;
end;

function TEtsClient.CheckEInvoiceUser(const PartyId: string): Boolean;
var
  ResultObj: TJSONObject;
begin
  ResultObj := Post('/invoice/user/' + PartyId);
  try
    Result := ResultObj.GetValue<Boolean>('IsActive', False);
  finally
    ResultObj.Free;
  end;
end;

function TEtsClient.GetUserAliases(const PartyId: string): TJSONArray;
var
  ResultObj: TJSONObject;
begin
  ResultObj := Post('/invoice/user/' + PartyId + '/alias');
  try
    if ResultObj.FindValue('Aliases') <> nil then
      Result := ResultObj.GetValue<TJSONArray>('Aliases').Clone as TJSONArray
    else
      Result := TJSONArray.Create;
  finally
    ResultObj.Free;
  end;
end;

function TEtsClient.SendInvoice(Invoice: TJSONObject): TJSONObject;
begin
  Result := Post('/invoice', Invoice);
end;

function TEtsClient.GetInvoiceStatus(const Uuid: string): TJSONObject;
begin
  Result := Get('/invoice/' + Uuid + '/status');
end;

function TEtsClient.GetExchangeRate(const Currency, Date: string): TJSONObject;
begin
  Result := Get('/currency/rate?currency=' + Currency + '&date=' + Date);
end;

// ==================== MAIN ====================

var
  Client: TEtsClient;
  Token, Vkn, Uuid: string;
  IsActive: Boolean;
  Aliases: TJSONArray;
  Invoice, InvoiceData, Supplier, Customer, TargetCustomer, ResultObj, StatusObj, RateObj: TJSONObject;
  Lines: TJSONArray;
  I: Integer;
begin
  WriteLn('=== Entegre ETS API Ornegi (Delphi) ===');
  WriteLn;

  Client := TEtsClient.Create(BASE_URL);
  try
    try
      // 1. Kimlik dogrulama
      WriteLn('1. Kimlik dogrulama yapiliyor...');
      Token := Client.Authenticate(
        '1234567890',
        'test_user',
        'test_pass',
        'ETS-DELPHI-SAMPLE',
        'UYM'
      );
      WriteLn('   EtsToken alindi: ' + Copy(Token, 1, 30) + '...');
      WriteLn;

      // 2. E-Fatura mukellefi sorgula
      WriteLn('2. E-Fatura mukellefi sorgulaniyor...');
      Vkn := '1234567890';
      IsActive := Client.CheckEInvoiceUser(Vkn);
      WriteLn(Format('   VKN %s e-fatura mukellefi: %s', [Vkn, BoolToStr(IsActive, True)]));
      WriteLn;

      // 3. Alias listesi al
      WriteLn('3. Alias listesi aliniyor...');
      Aliases := Client.GetUserAliases(Vkn);
      try
        WriteLn(Format('   Bulunan alias sayisi: %d', [Aliases.Count]));
        for I := 0 to Aliases.Count - 1 do
        begin
          WriteLn(Format('      - %s (%s)', [
            Aliases.Items[I].GetValue<string>('Alias'),
            Aliases.Items[I].GetValue<string>('Type')
          ]));
        end;
      finally
        Aliases.Free;
      end;
      WriteLn;

      // 4. Fatura olustur ve gonder
      WriteLn('4. Fatura gonderiliyor...');

      // Supplier Address
      var SupplierAddress := TJSONObject.Create;
      SupplierAddress.AddPair('Country', 'Turkiye');
      SupplierAddress.AddPair('CityName', 'Istanbul');
      SupplierAddress.AddPair('CitySubdivisionName', 'Kadikoy');
      SupplierAddress.AddPair('StreetName', 'Bagdat Caddesi No:123');
      SupplierAddress.AddPair('BuildingNumber', '123');
      SupplierAddress.AddPair('PostalZone', '34710');

      // Supplier
      Supplier := TJSONObject.Create;
      Supplier.AddPair('PartyIdentification', '1234567890');
      Supplier.AddPair('PartyName', 'Ornek Teknoloji A.S.');
      Supplier.AddPair('TaxOffice', 'Kadikoy VD');
      Supplier.AddPair('Address', SupplierAddress);

      // Customer Address
      var CustomerAddress := TJSONObject.Create;
      CustomerAddress.AddPair('Country', 'Turkiye');
      CustomerAddress.AddPair('CityName', 'Ankara');
      CustomerAddress.AddPair('CitySubdivisionName', 'Cankaya');
      CustomerAddress.AddPair('StreetName', 'Ataturk Bulvari No:456');
      CustomerAddress.AddPair('BuildingNumber', '456');
      CustomerAddress.AddPair('PostalZone', '06690');

      // Customer
      Customer := TJSONObject.Create;
      Customer.AddPair('PartyIdentification', '9876543210');
      Customer.AddPair('PartyName', 'ABC Yazilim Ltd. Sti.');
      Customer.AddPair('TaxOffice', 'Cankaya VD');
      Customer.AddPair('Address', CustomerAddress);

      Lines := TJSONArray.Create;

      // Kalem 1: Yazilim Lisansi
      var Tax1 := TJSONObject.Create;
      Tax1.AddPair('TaxCode', '0015');
      Tax1.AddPair('TaxName', 'KDV');
      Tax1.AddPair('Percent', TJSONNumber.Create(20));
      Tax1.AddPair('TaxAmount', TJSONNumber.Create(10000));

      var Taxes1 := TJSONArray.Create;
      Taxes1.Add(Tax1);

      var Line1 := TJSONObject.Create;
      Line1.AddPair('ItemCode', 'YZL-001');
      Line1.AddPair('ItemName', 'ERP Yazilim Lisansi (Yillik)');
      Line1.AddPair('InvoicedQuantity', TJSONNumber.Create(1));
      Line1.AddPair('IsoUnitCode', 'ADET');
      Line1.AddPair('Price', TJSONNumber.Create(50000));
      Line1.AddPair('LineExtensionAmount', TJSONNumber.Create(50000));
      Line1.AddPair('Taxes', Taxes1);
      Lines.Add(Line1);

      // Kalem 2: Teknik Destek
      var Tax2 := TJSONObject.Create;
      Tax2.AddPair('TaxCode', '0015');
      Tax2.AddPair('TaxName', 'KDV');
      Tax2.AddPair('Percent', TJSONNumber.Create(20));
      Tax2.AddPair('TaxAmount', TJSONNumber.Create(6000));

      var Taxes2 := TJSONArray.Create;
      Taxes2.Add(Tax2);

      var Line2 := TJSONObject.Create;
      Line2.AddPair('ItemCode', 'DST-001');
      Line2.AddPair('ItemName', 'Teknik Destek Hizmeti (12 Ay)');
      Line2.AddPair('InvoicedQuantity', TJSONNumber.Create(12));
      Line2.AddPair('IsoUnitCode', 'ADET');
      Line2.AddPair('Price', TJSONNumber.Create(2500));
      Line2.AddPair('LineExtensionAmount', TJSONNumber.Create(30000));
      Line2.AddPair('Taxes', Taxes2);
      Lines.Add(Line2);

      // Kalem 3: Egitim
      var Tax3 := TJSONObject.Create;
      Tax3.AddPair('TaxCode', '0015');
      Tax3.AddPair('TaxName', 'KDV');
      Tax3.AddPair('Percent', TJSONNumber.Create(20));
      Tax3.AddPair('TaxAmount', TJSONNumber.Create(3000));

      var Taxes3 := TJSONArray.Create;
      Taxes3.Add(Tax3);

      var Line3 := TJSONObject.Create;
      Line3.AddPair('ItemCode', 'EGT-001');
      Line3.AddPair('ItemName', 'Kullanici Egitimi (Kisi/Gun)');
      Line3.AddPair('InvoicedQuantity', TJSONNumber.Create(5));
      Line3.AddPair('IsoUnitCode', 'ADET');
      Line3.AddPair('Price', TJSONNumber.Create(3000));
      Line3.AddPair('LineExtensionAmount', TJSONNumber.Create(15000));
      Line3.AddPair('Taxes', Taxes3);
      Lines.Add(Line3);

      // Toplamlar
      var LineTotal: Integer := 95000;  // 50000 + 30000 + 15000
      var TaxTotal: Integer := 19000;   // 10000 + 6000 + 3000
      var GrandTotal: Integer := LineTotal + TaxTotal;

      // Notes
      var Notes := TJSONArray.Create;
      Notes.Add('Bu fatura elektronik olarak olusturulmustur.');
      Notes.Add('Odeme vadesi: 30 gun');
      Notes.Add('IBAN: TR00 0000 0000 0000 0000 0000 00');

      // Tax Subtotal
      var TaxSubtotal := TJSONObject.Create;
      TaxSubtotal.AddPair('TaxCode', '0015');
      TaxSubtotal.AddPair('TaxName', 'KDV');
      TaxSubtotal.AddPair('TaxableAmount', TJSONNumber.Create(LineTotal));
      TaxSubtotal.AddPair('TaxAmount', TJSONNumber.Create(TaxTotal));
      TaxSubtotal.AddPair('Percent', TJSONNumber.Create(20));

      var TaxSubtotals := TJSONArray.Create;
      TaxSubtotals.Add(TaxSubtotal);

      var TaxTotalObj := TJSONObject.Create;
      TaxTotalObj.AddPair('TaxAmount', TJSONNumber.Create(TaxTotal));
      TaxTotalObj.AddPair('TaxSubtotals', TaxSubtotals);

      // Invoice data
      InvoiceData := TJSONObject.Create;
      InvoiceData.AddPair('InvoiceTypeCode', 'SATIS');
      InvoiceData.AddPair('ProfileId', 'TEMELFATURA');
      InvoiceData.AddPair('IssueDate', FormatDateTime('yyyy-mm-dd', Now));
      InvoiceData.AddPair('DocumentCurrencyCode', 'TRY');
      InvoiceData.AddPair('Notes', Notes);
      InvoiceData.AddPair('Supplier', Supplier);
      InvoiceData.AddPair('Customer', Customer);
      InvoiceData.AddPair('Lines', Lines);
      InvoiceData.AddPair('LineExtensionAmount', TJSONNumber.Create(LineTotal));
      InvoiceData.AddPair('TaxExclusiveAmount', TJSONNumber.Create(LineTotal));
      InvoiceData.AddPair('TaxInclusiveAmount', TJSONNumber.Create(GrandTotal));
      InvoiceData.AddPair('PayableAmount', TJSONNumber.Create(GrandTotal));
      InvoiceData.AddPair('TaxTotal', TaxTotalObj);

      // Target customer
      TargetCustomer := TJSONObject.Create;
      TargetCustomer.AddPair('Alias', 'urn:mail:defaultpk@9876543210');

      // Invoice request
      Invoice := TJSONObject.Create;
      Invoice.AddPair('Invoice', InvoiceData);
      Invoice.AddPair('TargetCustomer', TargetCustomer);

      // Fatura ozeti
      WriteLn('   Fatura Detaylari:');
      WriteLn(Format('   - Kalem Sayisi: %d', [Lines.Count]));
      WriteLn(Format('   - Ara Toplam: %n TRY', [LineTotal * 1.0]));
      WriteLn(Format('   - KDV (%%20): %n TRY', [TaxTotal * 1.0]));
      WriteLn(Format('   - Genel Toplam: %n TRY', [GrandTotal * 1.0]));

      try
        ResultObj := Client.SendInvoice(Invoice);
        try
          WriteLn;
          WriteLn('   Fatura gonderildi!');
          Uuid := ResultObj.GetValue<string>('Uuid', '');
          WriteLn('   UUID: ' + Uuid);
          WriteLn('   Numara: ' + ResultObj.GetValue<string>('Number', ''));
        finally
          ResultObj.Free;
        end;
      finally
        Invoice.Free;
      end;
      WriteLn;

      // 5. Durum sorgula
      if Uuid <> '' then
      begin
        WriteLn('5. Fatura durumu sorgulaniyor...');
        StatusObj := Client.GetInvoiceStatus(Uuid);
        try
          WriteLn('   Durum: ' + StatusObj.GetValue<string>('Status', 'UNKNOWN'));
        finally
          StatusObj.Free;
        end;
        WriteLn;
      end;

      // 6. Doviz kuru sorgula
      WriteLn('6. Doviz kuru sorgulaniyor...');
      RateObj := Client.GetExchangeRate('USD', FormatDateTime('yyyy-mm-dd', Now));
      try
        WriteLn('   1 USD = ' + RateObj.GetValue<string>('Rate', '?') + ' TRY');
      finally
        RateObj.Free;
      end;
      WriteLn;

      WriteLn('=== Islemler tamamlandi ===');

    except
      on E: Exception do
        WriteLn('Hata: ' + E.Message);
    end;
  finally
    Client.Free;
  end;

  ReadLn;
end.
