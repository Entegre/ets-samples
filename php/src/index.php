<?php

require_once __DIR__ . '/../vendor/autoload.php';

use Entegre\Ets\EtsClient;

echo "=== Entegre ETS API Ornegi (PHP) ===\n\n";

$client = new EtsClient('https://ets-test.entegre.net');

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
    $invoice = [
        'Invoice' => [
            'InvoiceTypeCode' => 'SATIS',
            'ProfileId' => 'TEMELFATURA',
            'IssueDate' => date('Y-m-d'),
            'DocumentCurrencyCode' => 'TRY',
            'Notes' => ['Bu bir test faturasidir.'],
            'Supplier' => [
                'PartyIdentification' => '1234567890',
                'PartyName' => 'Test Satici Ltd. Sti.',
                'TaxOffice' => 'Test VD',
                'Address' => [
                    'CityName' => 'Istanbul',
                    'CitySubdivisionName' => 'Kadikoy',
                    'StreetName' => 'Test Sokak No:1',
                ],
            ],
            'Customer' => [
                'PartyIdentification' => '9876543210',
                'PartyName' => 'Test Alici A.S.',
                'TaxOffice' => 'Test VD',
            ],
            'Lines' => [
                [
                    'ItemCode' => 'URUN001',
                    'ItemName' => 'Test Urun',
                    'InvoicedQuantity' => 10,
                    'IsoUnitCode' => 'ADET',
                    'Price' => 100,
                    'LineExtensionAmount' => 1000,
                    'Taxes' => [
                        ['TaxCode' => '0015', 'TaxName' => 'KDV', 'Percent' => 20, 'TaxAmount' => 200],
                    ],
                ],
            ],
            'LineExtensionAmount' => 1000,
            'TaxExclusiveAmount' => 1000,
            'TaxInclusiveAmount' => 1200,
            'PayableAmount' => 1200,
        ],
        'TargetCustomer' => ['Alias' => 'urn:mail:defaultpk@9876543210'],
    ];

    $result = $client->sendInvoice($invoice);
    echo "   Fatura gonderildi!\n";
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
