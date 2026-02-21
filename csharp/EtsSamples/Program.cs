using Entegre.Ets.Samples;

Console.WriteLine("=== Entegre ETS API Ornegi (C#) ===\n");

using var client = new EtsClient("https://ets-test.entegre.net");

try
{
    // 1. Kimlik dogrulama
    Console.WriteLine("1. Kimlik dogrulama yapiliyor...");
    var token = await client.AuthenticateAsync(new EntegreId
    {
        PartyIdentificationId = "1234567890",
        Username = "test_user",
        Password = "test_pass",
        SoftwareId = "ETS-CSHARP-SAMPLE",
        Integrator = "UYM"
    });
    Console.WriteLine($"   EtsToken alindi: {token[..30]}...\n");

    // 2. E-Fatura mukellefi sorgula
    Console.WriteLine("2. E-Fatura mukellefi sorgulaniyor...");
    var vkn = "1234567890";
    var isActive = await client.CheckEInvoiceUserAsync(vkn);
    Console.WriteLine($"   VKN {vkn} e-fatura mukellefi: {isActive}\n");

    // 3. Alias listesi al
    Console.WriteLine("3. Alias listesi aliniyor...");
    var aliases = await client.GetUserAliasesAsync(vkn);
    Console.WriteLine($"   Bulunan alias sayisi: {aliases.Count}");
    foreach (var alias in aliases)
    {
        Console.WriteLine($"      - {alias.Alias} ({alias.Type})");
    }
    Console.WriteLine();

    // 4. Fatura olustur ve gonder
    Console.WriteLine("4. Fatura gonderiliyor...");
    var invoice = new InvoiceModel
    {
        Invoice = new Invoice
        {
            InvoiceTypeCode = "SATIS",
            ProfileId = "TEMELFATURA",
            IssueDate = DateTime.Today.ToString("yyyy-MM-dd"),
            DocumentCurrencyCode = "TRY",
            Notes = new List<string> { "Bu bir test faturasidir." },
            Supplier = new Party
            {
                PartyIdentification = "1234567890",
                PartyName = "Test Satici Ltd. Sti.",
                TaxOffice = "Test VD",
                Address = new Address
                {
                    CityName = "Istanbul",
                    CitySubdivisionName = "Kadikoy",
                    StreetName = "Test Sokak No:1"
                }
            },
            Customer = new Party
            {
                PartyIdentification = "9876543210",
                PartyName = "Test Alici A.S.",
                TaxOffice = "Test VD",
                Address = new Address
                {
                    CityName = "Ankara",
                    CitySubdivisionName = "Cankaya",
                    StreetName = "Ornek Caddesi No:5"
                }
            },
            Lines = new List<DocumentLine>
            {
                new()
                {
                    ItemCode = "URUN001",
                    ItemName = "Test Urun",
                    InvoicedQuantity = 10,
                    IsoUnitCode = "ADET",
                    Price = 100.00m,
                    LineExtensionAmount = 1000.00m,
                    Taxes = new List<Tax>
                    {
                        new() { TaxCode = "0015", TaxName = "KDV", Percent = 20, TaxAmount = 200.00m }
                    }
                }
            },
            LineExtensionAmount = 1000.00m,
            TaxExclusiveAmount = 1000.00m,
            TaxInclusiveAmount = 1200.00m,
            PayableAmount = 1200.00m,
            TaxTotal = new TaxTotal
            {
                TaxAmount = 200.00m,
                TaxSubtotals = new List<TaxSubtotal>
                {
                    new() { TaxCode = "0015", TaxName = "KDV", TaxableAmount = 1000.00m, TaxAmount = 200.00m, Percent = 20 }
                }
            }
        },
        TargetCustomer = new TargetCustomer
        {
            Alias = "urn:mail:defaultpk@9876543210"
        }
    };

    var result = await client.SendInvoiceAsync(invoice);
    Console.WriteLine($"   Fatura gonderildi!");
    Console.WriteLine($"   UUID: {result.Uuid}");
    Console.WriteLine($"   Numara: {result.Number}\n");

    // 5. Durum sorgula
    if (!string.IsNullOrEmpty(result.Uuid))
    {
        Console.WriteLine("5. Fatura durumu sorgulaniyor...");
        var status = await client.GetInvoiceStatusAsync(result.Uuid);
        Console.WriteLine($"   Durum: {status.Status}\n");
    }

    // 6. Doviz kuru sorgula
    Console.WriteLine("6. Doviz kuru sorgulaniyor...");
    var rate = await client.GetExchangeRateAsync("USD", DateTime.Today.ToString("yyyy-MM-dd"));
    Console.WriteLine($"   1 USD = {rate.Rate} TRY\n");

    Console.WriteLine("=== Islemler tamamlandi ===");
}
catch (HttpRequestException ex)
{
    Console.WriteLine($"HTTP Hatasi: {ex.Message}");
}
catch (Exception ex)
{
    Console.WriteLine($"Hata: {ex.Message}");
}
