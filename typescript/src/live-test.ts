/**
 * ETS API Live Test
 * Production ortaminda gercek test
 *
 * Kullanim:
 * ETS_PARTY_ID=xxx ETS_USERNAME=xxx ETS_PASSWORD=xxx npx ts-node src/live-test.ts
 */

import axios from 'axios';

async function runTest() {
  console.log('='.repeat(60));
  console.log('ETS API CANLI TEST');
  console.log('='.repeat(60));
  console.log();

  const baseUrl = process.env.ETS_BASE_URL || 'http://localhost:80';

  // Kimlik bilgileri - environment variable'lardan al
  const credentials = {
    PartyIdentificationId: process.env.ETS_PARTY_ID || '',
    Username: process.env.ETS_USERNAME || '',
    Password: process.env.ETS_PASSWORD || '',
    SoftwareId: process.env.ETS_SOFTWARE_ID || 'ETS-CLIENT',
    Integrator: process.env.ETS_INTEGRATOR || 'UYM',
  };

  // Alici bilgileri
  const aliciVkn = process.env.ETS_ALICI_VKN || '';
  const aliciAd = process.env.ETS_ALICI_AD || 'Test Alici';
  const aliciSoyad = process.env.ETS_ALICI_SOYAD || 'Test';

  // Validasyon
  if (!credentials.PartyIdentificationId || !credentials.Username || !credentials.Password) {
    console.error('HATA: Environment variable\'lar eksik!');
    console.error('Kullanim:');
    console.error('  ETS_PARTY_ID=xxx ETS_USERNAME=xxx ETS_PASSWORD=xxx npx ts-node src/live-test.ts');
    console.error();
    console.error('Opsiyonel:');
    console.error('  ETS_BASE_URL=https://ets.bulutix.com');
    console.error('  ETS_ALICI_VKN=12345678901');
    console.error('  ETS_ALICI_AD=Ahmet');
    console.error('  ETS_ALICI_SOYAD=Yilmaz');
    return;
  }

  let etsToken: string = '';

  try {
    // ==================== ADIM 1: Authentication ====================
    console.log('ADIM 1: Authentication');
    console.log('-'.repeat(40));
    console.log('  VKN:', credentials.PartyIdentificationId);
    console.log('  Username:', credentials.Username);
    console.log();

    const authResponse = await axios.post(`${baseUrl}/auth/token`, credentials, {
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('  Response:', JSON.stringify(authResponse.data, null, 2));
    console.log();

    if (authResponse.data.success) {
      etsToken = authResponse.data.data?.token || authResponse.data.data?.EtsToken;
      console.log('✓ Basarili!');
      console.log(`  Token: ${etsToken?.substring(0, 50)}...`);
    } else {
      console.log('✗ Basarisiz!');
      console.log(`  Mesaj: ${authResponse.data.message}`);
      return;
    }
    console.log();

    // ==================== ADIM 2: E-Fatura Kullanici Kontrolu ====================
    if (aliciVkn) {
      console.log('ADIM 2: E-Fatura Kullanici Kontrolu');
      console.log('-'.repeat(40));
      console.log(`  Sorgulanan VKN: ${aliciVkn}`);

      const userCheckResponse = await axios.post(
        `${baseUrl}/invoice/user/${aliciVkn}`,
        { EtsToken: etsToken },
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.log('  Response:', JSON.stringify(userCheckResponse.data, null, 2));

      const isEInvoiceUser = userCheckResponse.data.data?.IsActive ?? userCheckResponse.data.data?.isActive ?? false;
      console.log(`  E-Fatura Mukellefi: ${isEInvoiceUser ? 'EVET' : 'HAYIR'}`);
      console.log();
    }

    // ==================== ADIM 3: Alias Bilgisi ====================
    console.log('ADIM 3: Alias Bilgisi');
    console.log('-'.repeat(40));

    console.log(`  Gonderici (${credentials.PartyIdentificationId}) alias listesi:`);
    const senderAliasResponse = await axios.post(
      `${baseUrl}/invoice/user/${credentials.PartyIdentificationId}/alias`,
      { EtsToken: etsToken },
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log('  Response:', JSON.stringify(senderAliasResponse.data, null, 2));

    const senderAliases = senderAliasResponse.data.data?.senderboxAliases || [];
    if (senderAliases.length > 0) {
      senderAliases.forEach((alias: any, i: number) => {
        console.log(`    ${i + 1}. ${alias.alias}`);
      });
    } else {
      console.log('    Alias bulunamadi');
    }
    console.log();

    // ==================== ADIM 4: Taslak Fatura Olustur ====================
    if (aliciVkn) {
      console.log('ADIM 4: Taslak Fatura Olusturma');
      console.log('-'.repeat(40));

      const today = new Date().toISOString().split('T')[0];
      const invoiceId = `TEST${Date.now()}`;
      const senderAlias = senderAliases[0]?.alias || `urn:mail:defaultgb@${credentials.PartyIdentificationId}`;

      const invoiceRequest = {
        EtsToken: etsToken,
        Invoice: {
          IsDraft: true,
          InvoiceId: invoiceId,
          InvoiceTypeCode: 'SATIS',
          ProfileId: 'EARSIVFATURA',
          IssueDate: today,
          DocumentCurrencyCode: 'TRY',
          CurrencyId: 'TRY',
          Notes: [
            'Bu bir test faturasıdır.',
            'ETS API entegrasyon testi.',
          ],
          SupplierParty: {
            PartyIdentification: credentials.PartyIdentificationId,
            PartyName: senderAliasResponse.data.data?.title || 'Test Firma',
            PartyTaxScheme: 'TEST VD',
            Alias: senderAlias,
            Address: {
              Country: 'Türkiye',
              CityName: 'Istanbul',
              CitySubdivisionName: 'Merkez',
              StreetName: 'Test Sokak No:1',
              BuildingNumber: '1',
              PostalZone: '34000',
            },
          },
          CustomerParty: {
            PartyIdentification: aliciVkn,
            PartyName: `${aliciAd} ${aliciSoyad}`,
            PartyTaxScheme: '',
            Address: {
              Country: 'Türkiye',
              CityName: 'Istanbul',
              CitySubdivisionName: 'Merkez',
              DistrictName: 'Merkez',
              StreetName: 'Test Adres',
              BuildingNumber: '1',
              PostalZone: '34000',
            },
            Person: {
              FirstName: aliciAd,
              FamilyName: aliciSoyad,
            },
          },
          DocumentLines: [
            {
              ItemCode: 'TEST-001',
              ItemName: 'Test Urun',
              InvoicedQuantity: 1,
              IsoUnitCode: 'C62',
              CurrencyId: 'TRY',
              Price: 100,
              LineExtensionAmount: 100,
              Taxes: [
                {
                  TaxCode: '0015',
                  TaxName: 'KDV',
                  Percent: 20,
                  TaxAmount: 20,
                },
              ],
            },
          ],
          LegalMonetaryTotal: {
            LineExtensionAmount: 100,
            TaxIncludedAmount: 120,
            AllowanceTotalAmount: 0,
            PayableAmount: 120,
          },
          TaxTotals: [
            {
              TaxCode: '0015',
              TaxName: 'KDV',
              Percent: 20,
              TaxAmount: 20,
            },
          ],
        },
        TargetCustomer: {
          PartyName: `${aliciAd} ${aliciSoyad}`,
          PartyIdentification: aliciVkn,
          Alias: `urn:mail:defaultpk@${aliciVkn}`,
        },
        ArchiveInfo: {
          SendingType: 'ELEKTRONIK',
          IsInternetSales: false,
        },
      };

      console.log('  Fatura Detaylari:');
      console.log(`    Fatura No: ${invoiceId}`);
      console.log(`    Tarih: ${today}`);
      console.log(`    Alici: ${aliciAd} ${aliciSoyad} (${aliciVkn})`);
      console.log(`    Tutar: 100 TRY + 20 TRY KDV = 120 TRY`);
      console.log();

      console.log('  E-Arsiv fatura gonderiliyor...');
      const earchiveResponse = await axios.post(
        `${baseUrl}/earchive`,
        invoiceRequest,
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.log('  Response:', JSON.stringify(earchiveResponse.data, null, 2));

      if (earchiveResponse.data.success) {
        console.log('✓ E-Arsiv Fatura Olusturuldu!');
        console.log(`  UUID: ${earchiveResponse.data.data?.uuid}`);
        console.log(`  Numara: ${earchiveResponse.data.data?.invoiceNumber}`);
      } else {
        console.log('✗ Basarisiz!');
        console.log(`  Mesaj: ${earchiveResponse.data.message}`);
      }
      console.log();
    }

    // ==================== SONUC ====================
    console.log('='.repeat(60));
    console.log('TEST TAMAMLANDI!');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error();
    console.error('HATA OLUSTU!');
    console.error('-'.repeat(40));
    console.error(`Mesaj: ${error.message}`);
    if (error.response?.data) {
      console.error('API Yaniti:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status) {
      console.error(`HTTP Status: ${error.response.status}`);
    }
  }
}

runTest();
