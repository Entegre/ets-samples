const { EtsClient } = require('./ets-client');

async function main() {
  console.log('=== Entegre ETS API Ornegi (JavaScript) ===\n');

  const client = new EtsClient('https://ets-test.entegre.net');

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
    const invoice = {
      Invoice: {
        InvoiceTypeCode: 'SATIS',
        ProfileId: 'TEMELFATURA',
        IssueDate: new Date().toISOString().split('T')[0],
        DocumentCurrencyCode: 'TRY',
        Notes: ['Bu bir test faturasidir.'],
        Supplier: {
          PartyIdentification: '1234567890',
          PartyName: 'Test Satici Ltd. Sti.',
          TaxOffice: 'Test VD',
          Address: {
            CityName: 'Istanbul',
            CitySubdivisionName: 'Kadikoy',
            StreetName: 'Test Sokak No:1',
          },
        },
        Customer: {
          PartyIdentification: '9876543210',
          PartyName: 'Test Alici A.S.',
          TaxOffice: 'Test VD',
          Address: {
            CityName: 'Ankara',
            CitySubdivisionName: 'Cankaya',
            StreetName: 'Ornek Caddesi No:5',
          },
        },
        Lines: [
          {
            ItemCode: 'URUN001',
            ItemName: 'Test Urun',
            InvoicedQuantity: 10,
            IsoUnitCode: 'ADET',
            Price: 100,
            LineExtensionAmount: 1000,
            Taxes: [{ TaxCode: '0015', TaxName: 'KDV', Percent: 20, TaxAmount: 200 }],
          },
        ],
        LineExtensionAmount: 1000,
        TaxExclusiveAmount: 1000,
        TaxInclusiveAmount: 1200,
        PayableAmount: 1200,
        TaxTotal: {
          TaxAmount: 200,
          TaxSubtotals: [
            { TaxCode: '0015', TaxName: 'KDV', TaxableAmount: 1000, TaxAmount: 200, Percent: 20 },
          ],
        },
      },
      TargetCustomer: { Alias: 'urn:mail:defaultpk@9876543210' },
    };

    const result = await client.sendInvoice(invoice);
    console.log('   Fatura gonderildi!');
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
