<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Entegre\Ets\EtsClient;

echo "=== Entegre ETS API Ornegi (PHP) ===\n\n";

$client = new EtsClient('https://ets-test.bulutix.com');

try {
    // 1. Kimlik dogrulama
    echo "1. Kimlik dogrulama yapiliyor...\n";
    $token = $client->authenticate([
        'PartyIdentificationId' => '1234567890',
        'Username' => 'test_user',
        'Password' => 'test_pass',
        'SoftwareId' => 'ETS-PHP-SAMPLE',
        'Integrator' => 'UYM',
    ]);
    echo "   EtsToken alindi: " . substr($token, 0, 30) . "...\n\n";

    // 2. E-Fatura mukellefi sorgula
    echo "2. E-Fatura mukellefi sorgulaniyor...\n";
    $vkn = '1234567890';
    $isActive = $client->checkEInvoiceUser($vkn);
    echo "   VKN {$vkn} e-fatura mukellefi: " . ($isActive ? 'true' : 'false') . "\n\n";

    // 3. Alias listesi al
    echo "3. Alias listesi aliniyor...\n";
    $aliases = $client->getUserAliases($vkn);
    echo "   Bulunan alias sayisi: " . count($aliases) . "\n";
    foreach ($aliases as $alias) {
        echo "      - {$alias['Alias']} ({$alias['Type']})\n";
    }
    echo "\n";

    // 4. Fatura olustur ve gonder
    echo "4. Fatura gonderiliyor...\n";

    // Fatura kalemleri
    $lines = [
        [
            'ItemCode' => 'YZL-001',
            'ItemName' => 'ERP Yazilim Lisansi (Yillik)',
            'InvoicedQuantity' => 1,
            'IsoUnitCode' => 'ADET',
            'Price' => 50000,
            'LineExtensionAmount' => 50000,
            'Taxes' => [
                ['TaxCode' => '0015', 'TaxName' => 'KDV', 'Percent' => 20, 'TaxAmount' => 10000],
            ],
        ],
        [
            'ItemCode' => 'DST-001',
            'ItemName' => 'Teknik Destek Hizmeti (12 Ay)',
            'InvoicedQuantity' => 12,
            'IsoUnitCode' => 'ADET',
            'Price' => 2500,
            'LineExtensionAmount' => 30000,
            'Taxes' => [
                ['TaxCode' => '0015', 'TaxName' => 'KDV', 'Percent' => 20, 'TaxAmount' => 6000],
            ],
        ],
        [
            'ItemCode' => 'EGT-001',
            'ItemName' => 'Kullanici Egitimi (Kisi/Gun)',
            'InvoicedQuantity' => 5,
            'IsoUnitCode' => 'ADET',
            'Price' => 3000,
            'LineExtensionAmount' => 15000,
            'Taxes' => [
                ['TaxCode' => '0015', 'TaxName' => 'KDV', 'Percent' => 20, 'TaxAmount' => 3000],
            ],
        ],
    ];

    // Toplamlar
    $lineTotal = array_sum(array_column($lines, 'LineExtensionAmount'));
    $taxTotal = array_sum(array_map(fn($l) => $l['Taxes'][0]['TaxAmount'], $lines));
    $grandTotal = $lineTotal + $taxTotal;

    $invoice = [
        'Invoice' => [
            'InvoiceTypeCode' => 'SATIS',
            'ProfileId' => 'TEMELFATURA',
            'IssueDate' => date('Y-m-d'),
            'DocumentCurrencyCode' => 'TRY',
            'Notes' => [
                'Bu fatura elektronik olarak olusturulmustur.',
                'Odeme vadesi: 30 gun',
                'IBAN: TR00 0000 0000 0000 0000 0000 00',
            ],
            'Supplier' => [
                'PartyIdentification' => '1234567890',
                'PartyName' => 'Ornek Teknoloji A.S.',
                'TaxOffice' => 'Kadikoy VD',
                'Address' => [
                    'Country' => 'Turkiye',
                    'CityName' => 'Istanbul',
                    'CitySubdivisionName' => 'Kadikoy',
                    'StreetName' => 'Bagdat Caddesi No:123',
                    'BuildingNumber' => '123',
                    'PostalZone' => '34710',
                ],
            ],
            'Customer' => [
                'PartyIdentification' => '9876543210',
                'PartyName' => 'ABC Yazilim Ltd. Sti.',
                'TaxOffice' => 'Cankaya VD',
                'Address' => [
                    'Country' => 'Turkiye',
                    'CityName' => 'Ankara',
                    'CitySubdivisionName' => 'Cankaya',
                    'StreetName' => 'Ataturk Bulvari No:456',
                    'BuildingNumber' => '456',
                    'PostalZone' => '06690',
                ],
            ],
            'Lines' => $lines,
            'LineExtensionAmount' => $lineTotal,
            'TaxExclusiveAmount' => $lineTotal,
            'TaxInclusiveAmount' => $grandTotal,
            'PayableAmount' => $grandTotal,
            'TaxTotal' => [
                'TaxAmount' => $taxTotal,
                'TaxSubtotals' => [
                    [
                        'TaxCode' => '0015',
                        'TaxName' => 'KDV',
                        'TaxableAmount' => $lineTotal,
                        'TaxAmount' => $taxTotal,
                        'Percent' => 20,
                    ],
                ],
            ],
        ],
        'TargetCustomer' => ['Alias' => 'urn:mail:defaultpk@9876543210'],
    ];

    // Fatura ozeti
    echo "   Fatura Detaylari:\n";
    echo "   - Kalem Sayisi: " . count($lines) . "\n";
    echo "   - Ara Toplam: " . number_format($lineTotal, 2, ',', '.') . " TRY\n";
    echo "   - KDV (%20): " . number_format($taxTotal, 2, ',', '.') . " TRY\n";
    echo "   - Genel Toplam: " . number_format($grandTotal, 2, ',', '.') . " TRY\n";

    $result = $client->sendInvoice($invoice);
    echo "\n   Fatura gonderildi!\n";
    echo "   UUID: {$result['Uuid']}\n";
    echo "   Numara: {$result['Number']}\n\n";

    // 5. Durum sorgula
    if (!empty($result['Uuid'])) {
        echo "5. Fatura durumu sorgulaniyor...\n";
        $status = $client->getInvoiceStatus($result['Uuid']);
        echo "   Durum: {$status['Status']}\n\n";
    }

    // 6. Doviz kuru sorgula
    echo "6. Doviz kuru sorgulaniyor...\n";
    $rate = $client->getExchangeRate('USD', date('Y-m-d'));
    echo "   1 USD = {$rate['Rate']} TRY\n\n";

    echo "=== Islemler tamamlandi ===\n";

} catch (\Exception $e) {
    echo "Hata: " . $e->getMessage() . "\n";
}
