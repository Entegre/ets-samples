<?php

namespace Entegre\Ets;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

/**
 * Entegre ETS API Client - PHP
 */
class EtsClient
{
    private Client $client;
    private string $baseUrl;
    private ?string $etsToken = null;

    public function __construct(string $baseUrl = 'https://ets-test.bulutix.com')
    {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
            'timeout' => 30.0,
            'headers' => [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
        ]);
    }

    /**
     * Kimlik dogrulama yapar ve EtsToken alir.
     */
    public function authenticate(array $entegreId): string
    {
        $response = $this->client->post('/auth/token', [
            'json' => $entegreId,
        ]);

        $result = json_decode($response->getBody()->getContents(), true);

        if (!($result['Success'] ?? false)) {
            throw new \Exception('Authentication failed: ' . ($result['Message'] ?? 'Unknown error'));
        }

        $this->etsToken = $result['Data']['EtsToken'];
        return $this->etsToken;
    }

    // ==================== E-FATURA ====================

    /**
     * E-Fatura mukellefi mi sorgular.
     */
    public function checkEInvoiceUser(string $partyId): bool
    {
        $result = $this->post("/invoice/user/{$partyId}");
        return $result['IsActive'] ?? false;
    }

    /**
     * Kullanici alias listesini getirir.
     */
    public function getUserAliases(string $partyId): array
    {
        $result = $this->post("/invoice/user/{$partyId}/alias");
        return $result['Aliases'] ?? [];
    }

    /**
     * E-Fatura gonderir.
     */
    public function sendInvoice(array $invoice): array
    {
        $invoice['EtsToken'] = $this->etsToken;
        return $this->post('/invoice', $invoice) ?? [];
    }

    /**
     * Taslak fatura gonderir.
     */
    public function sendDraftInvoice(array $invoice): array
    {
        $invoice['EtsToken'] = $this->etsToken;
        return $this->post('/invoice/draft', $invoice) ?? [];
    }

    /**
     * Fatura durumunu sorgular.
     */
    public function getInvoiceStatus(string $uuid): array
    {
        return $this->get("/invoice/{$uuid}/status") ?? [];
    }

    /**
     * Faturaya yanit verir (Kabul/Red).
     */
    public function respondInvoice(string $uuid, string $responseType, string $description = ''): array
    {
        return $this->post("/invoice/{$uuid}/respond", [
            'ResponseType' => $responseType,
            'Description' => $description,
        ]) ?? [];
    }

    // ==================== E-ARSIV ====================

    /**
     * E-Arsiv fatura gonderir.
     */
    public function sendEArchive(array $invoice, string $sendType = 'KAGIT'): array
    {
        $invoice['EtsToken'] = $this->etsToken;
        $invoice['ArchiveInfo'] = ['SendType' => $sendType];
        return $this->post('/earchive', $invoice) ?? [];
    }

    /**
     * E-Arsiv fatura durumunu sorgular.
     */
    public function getEArchiveStatus(string $uuid): array
    {
        return $this->get("/earchive/{$uuid}/status") ?? [];
    }

    /**
     * E-Arsiv faturayi iptal eder.
     */
    public function cancelEArchive(string $uuid): array
    {
        return $this->post("/earchive/{$uuid}/cancel") ?? [];
    }

    // ==================== DOVIZ KURU ====================

    /**
     * Doviz kurunu sorgular.
     */
    public function getExchangeRate(string $currency, string $date): array
    {
        return $this->get("/currency/rate?currency={$currency}&date={$date}") ?? [];
    }

    // ==================== PRIVATE METHODS ====================

    private function get(string $endpoint): ?array
    {
        $url = str_contains($endpoint, '?')
            ? "{$endpoint}&EtsToken={$this->etsToken}"
            : "{$endpoint}?EtsToken={$this->etsToken}";

        $response = $this->client->get($url);
        $result = json_decode($response->getBody()->getContents(), true);

        if (!($result['Success'] ?? false)) {
            throw new \Exception('Request failed: ' . ($result['Message'] ?? 'Unknown error'));
        }

        return $result['Data'] ?? null;
    }

    private function post(string $endpoint, array $data = []): ?array
    {
        $data['EtsToken'] = $this->etsToken;

        $response = $this->client->post($endpoint, [
            'json' => $data,
        ]);

        $result = json_decode($response->getBody()->getContents(), true);

        if (!($result['Success'] ?? false)) {
            throw new \Exception('Request failed: ' . ($result['Message'] ?? 'Unknown error'));
        }

        return $result['Data'] ?? null;
    }
}
