const { EtsClient } = require('./ets-client');

async function main() {
  console.log('=== Entegre ETS API Ornegi (JavaScript) ===\n');

  const client = new EtsClient('https://ets-test.bulutix.com');

  try {
    // 1. Kimlik dogrulama
    console.log('1. Kimlik dogrulama yapiliyor...');
    const token = await client.authenticate({
      PartyIdentificationId: '1234567890',
      Username: 'test_user',
      Password: 'test_pass',
      SoftwareId: 'ETS-JS-SAMPLE',
      Integrator: 'UYM',
    });
    console.log(`   EtsToken alindi: ${token.substring(0, 30)}...\n`);

    // 2. E-Fatura mukellefi sorgula
    console.log('2. E-Fatura mukellefi sorgulaniyor...');
    const vkn = '1234567890';
    const isActive = await client.checkEInvoiceUser(vkn);
    console.log(`   VKN ${vkn} e-fatura mukellefi: ${isActive}\n`);

    // 3. Alias listesi al
    console.log('3. Alias listesi aliniyor...');
    const aliases = await client.getUserAliases(vkn);
    console.log(`   Bulunan alias sayisi: ${aliases.length}`);
    aliases.forEach((alias) => {
      console.log(`      - ${alias.Alias} (${alias.Type})`);
    });
    console.log();

    // 4. Fatura olustur ve gonder
    console.log('4. Fatura gonderiliyor...');

    // Fatura kalemleri
    const lines = [
      {
        ItemCode: 'YZL-001',
        ItemName: 'ERP Yazilim Lisansi (Yillik)',
        InvoicedQuantity: 1,
        IsoUnitCode: 'ADET',
        Price: 50000,
        LineExtensionAmount: 50000,
        Taxes: [{ TaxCode: '0015', TaxName: 'KDV', Percent: 20, TaxAmount: 10000 }],
      },
      {
        ItemCode: 'DST-001',
        ItemName: 'Teknik Destek Hizmeti (12 Ay)',
        InvoicedQuantity: 12,
        IsoUnitCode: 'ADET',
        Price: 2500,
        LineExtensionAmount: 30000,
        Taxes: [{ TaxCode: '0015', TaxName: 'KDV', Percent: 20, TaxAmount: 6000 }],
      },
      {
        ItemCode: 'EGT-001',
        ItemName: 'Kullanici Egitimi (Kisi/Gun)',
        InvoicedQuantity: 5,
        IsoUnitCode: 'ADET',
        Price: 3000,
        LineExtensionAmount: 15000,
        Taxes: [{ TaxCode: '0015', TaxName: 'KDV', Percent: 20, TaxAmount: 3000 }],
      },
    ];

    // Toplamlar
    const lineTotal = lines.reduce((sum, l) => sum + l.LineExtensionAmount, 0);
    const taxTotal = lines.reduce((sum, l) => sum + l.Taxes[0].TaxAmount, 0);
    const grandTotal = lineTotal + taxTotal;

    const invoice = {
      Invoice: {
        InvoiceTypeCode: 'SATIS',
        ProfileId: 'TEMELFATURA',
        IssueDate: new Date().toISOString().split('T')[0],
        DocumentCurrencyCode: 'TRY',
        Notes: [
          'Bu fatura elektronik olarak olusturulmustur.',
          'Odeme vadesi: 30 gun',
          'IBAN: TR00 0000 0000 0000 0000 0000 00',
        ],
        Supplier: {
          PartyIdentification: '1234567890',
          PartyName: 'Ornek Teknoloji A.S.',
          TaxOffice: 'Kadikoy VD',
          Address: {
            Country: 'Turkiye',
            CityName: 'Istanbul',
            CitySubdivisionName: 'Kadikoy',
            StreetName: 'Bagdat Caddesi No:123',
            BuildingNumber: '123',
            PostalZone: '34710',
          },
        },
        Customer: {
          PartyIdentification: '9876543210',
          PartyName: 'ABC Yazilim Ltd. Sti.',
          TaxOffice: 'Cankaya VD',
          Address: {
            Country: 'Turkiye',
            CityName: 'Ankara',
            CitySubdivisionName: 'Cankaya',
            StreetName: 'Ataturk Bulvari No:456',
            BuildingNumber: '456',
            PostalZone: '06690',
          },
        },
        Lines: lines,
        LineExtensionAmount: lineTotal,
        TaxExclusiveAmount: lineTotal,
        TaxInclusiveAmount: grandTotal,
        PayableAmount: grandTotal,
        TaxTotal: {
          TaxAmount: taxTotal,
          TaxSubtotals: [
            {
              TaxCode: '0015',
              TaxName: 'KDV',
              TaxableAmount: lineTotal,
              TaxAmount: taxTotal,
              Percent: 20,
            },
          ],
        },
      },
      TargetCustomer: { Alias: 'urn:mail:defaultpk@9876543210' },
    };

    // Fatura ozeti
    console.log('   Fatura Detaylari:');
    console.log(`   - Kalem Sayisi: ${lines.length}`);
    console.log(`   - Ara Toplam: ${lineTotal.toLocaleString('tr-TR')} TRY`);
    console.log(`   - KDV (%20): ${taxTotal.toLocaleString('tr-TR')} TRY`);
    console.log(`   - Genel Toplam: ${grandTotal.toLocaleString('tr-TR')} TRY`);

    const result = await client.sendInvoice(invoice);
    console.log('\n   Fatura gonderildi!');
    console.log(`   UUID: ${result.Uuid}`);
    console.log(`   Numara: ${result.Number}\n`);

    // 5. Durum sorgula
    if (result.Uuid) {
      console.log('5. Fatura durumu sorgulaniyor...');
      const status = await client.getInvoiceStatus(result.Uuid);
      console.log(`   Durum: ${status.Status}\n`);
    }

    // 6. Doviz kuru sorgula
    console.log('6. Doviz kuru sorgulaniyor...');
    const rate = await client.getExchangeRate('USD', new Date().toISOString().split('T')[0]);
    console.log(`   1 USD = ${rate.Rate} TRY\n`);

    console.log('=== Islemler tamamlandi ===');
  } catch (error) {
    console.error(`Hata: ${error.message}`);
  }
}

main();
