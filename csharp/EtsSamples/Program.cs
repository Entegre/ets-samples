using Entegre.Ets.Samples;

Console.WriteLine("=== Entegre ETS API Ornegi (C#) ===\n");

using var client = new EtsClient("https://ets-test.bulutix.com");

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

    // Fatura kalemleri
    var lines = new List<DocumentLine>
    {
        new()
        {
            ItemCode = "YZL-001",
            ItemName = "ERP Yazilim Lisansi (Yillik)",
            InvoicedQuantity = 1,
            IsoUnitCode = "ADET",
            Price = 50000.00m,
            LineExtensionAmount = 50000.00m,
            Taxes = new List<Tax>
            {
                new() { TaxCode = "0015", TaxName = "KDV", Percent = 20, TaxAmount = 10000.00m }
            }
        },
        new()
        {
            ItemCode = "DST-001",
            ItemName = "Teknik Destek Hizmeti (12 Ay)",
            InvoicedQuantity = 12,
            IsoUnitCode = "ADET",
            Price = 2500.00m,
            LineExtensionAmount = 30000.00m,
            Taxes = new List<Tax>
            {
                new() { TaxCode = "0015", TaxName = "KDV", Percent = 20, TaxAmount = 6000.00m }
            }
        },
        new()
        {
            ItemCode = "EGT-001",
            ItemName = "Kullanici Egitimi (Kisi/Gun)",
            InvoicedQuantity = 5,
            IsoUnitCode = "ADET",
            Price = 3000.00m,
            LineExtensionAmount = 15000.00m,
            Taxes = new List<Tax>
            {
                new() { TaxCode = "0015", TaxName = "KDV", Percent = 20, TaxAmount = 3000.00m }
            }
        }
    };

    // Toplamlar
    var lineTotal = lines.Sum(l => l.LineExtensionAmount);
    var taxTotal = lines.Sum(l => l.Taxes!.Sum(t => t.TaxAmount));
    var grandTotal = lineTotal + taxTotal;

    var invoice = new InvoiceModel
    {
        Invoice = new Invoice
        {
            InvoiceTypeCode = "SATIS",
            ProfileId = "TEMELFATURA",
            IssueDate = DateTime.Today.ToString("yyyy-MM-dd"),
            DocumentCurrencyCode = "TRY",
            Notes = new List<string>
            {
                "Bu fatura elektronik olarak olusturulmustur.",
                "Odeme vadesi: 30 gun",
                "IBAN: TR00 0000 0000 0000 0000 0000 00"
            },
            Supplier = new Party
            {
                PartyIdentification = "1234567890",
                PartyName = "Ornek Teknoloji A.S.",
                TaxOffice = "Kadikoy VD",
                Address = new Address
                {
                    Country = "Turkiye",
                    CityName = "Istanbul",
                    CitySubdivisionName = "Kadikoy",
                    StreetName = "Bagdat Caddesi No:123",
                    BuildingNumber = "123",
                    PostalZone = "34710"
                }
            },
            Customer = new Party
            {
                PartyIdentification = "9876543210",
                PartyName = "ABC Yazilim Ltd. Sti.",
                TaxOffice = "Cankaya VD",
                Address = new Address
                {
                    Country = "Turkiye",
                    CityName = "Ankara",
                    CitySubdivisionName = "Cankaya",
                    StreetName = "Ataturk Bulvari No:456",
                    BuildingNumber = "456",
                    PostalZone = "06690"
                }
            },
            Lines = lines,
            LineExtensionAmount = lineTotal,
            TaxExclusiveAmount = lineTotal,
            TaxInclusiveAmount = grandTotal,
            PayableAmount = grandTotal,
            TaxTotal = new TaxTotal
            {
                TaxAmount = taxTotal,
                TaxSubtotals = new List<TaxSubtotal>
                {
                    new()
                    {
                        TaxCode = "0015",
                        TaxName = "KDV",
                        TaxableAmount = lineTotal,
                        TaxAmount = taxTotal,
                        Percent = 20
                    }
                }
            }
        },
        TargetCustomer = new TargetCustomer
        {
            Alias = "urn:mail:defaultpk@9876543210"
        }
    };

    // Fatura ozeti
    Console.WriteLine("   Fatura Detaylari:");
    Console.WriteLine($"   - Kalem Sayisi: {lines.Count}");
    Console.WriteLine($"   - Ara Toplam: {lineTotal:N2} TRY");
    Console.WriteLine($"   - KDV (%20): {taxTotal:N2} TRY");
    Console.WriteLine($"   - Genel Toplam: {grandTotal:N2} TRY");

    var result = await client.SendInvoiceAsync(invoice);
    Console.WriteLine($"\n   Fatura gonderildi!");
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
