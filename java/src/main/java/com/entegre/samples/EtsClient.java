package com.entegre.samples;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Entegre ETS API Client - Java
 */
public class EtsClient {

    private final String baseUrl;
    private final HttpClient httpClient;
    private final Gson gson;
    private String etsToken;

    public EtsClient(String baseUrl) {
        this.baseUrl = baseUrl.replaceAll("/$", "");
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(30))
                .build();
        this.gson = new Gson();
    }

    public EtsClient() {
        this("https://ets-test.bulutix.com");
    }

    /**
     * Kimlik dogrulama yapar ve EtsToken alir.
     */
    public String authenticate(EntegreId entegreId) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/auth/token"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(entegreId)))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Authentication failed: " + response.body());
        }

        JsonObject result = gson.fromJson(response.body(), JsonObject.class);
        if (!result.get("Success").getAsBoolean()) {
            throw new RuntimeException("Authentication failed: " + result.get("Message").getAsString());
        }

        this.etsToken = result.getAsJsonObject("Data").get("EtsToken").getAsString();
        return this.etsToken;
    }

    // ==================== E-FATURA ====================

    /**
     * E-Fatura mukellefi mi sorgular.
     */
    public boolean checkEInvoiceUser(String partyId) throws IOException, InterruptedException {
        JsonObject result = post("/invoice/user/" + partyId, null);
        return result != null && result.has("IsActive") && result.get("IsActive").getAsBoolean();
    }

    /**
     * Kullanici alias listesini getirir.
     */
    public List<Map<String, Object>> getUserAliases(String partyId) throws IOException, InterruptedException {
        JsonObject result = post("/invoice/user/" + partyId + "/alias", null);
        if (result != null && result.has("Aliases")) {
            return gson.fromJson(result.getAsJsonArray("Aliases"),
                    new TypeToken<List<Map<String, Object>>>() {}.getType());
        }
        return List.of();
    }

    /**
     * E-Fatura gonderir.
     */
    public Map<String, Object> sendInvoice(Map<String, Object> invoice) throws IOException, InterruptedException {
        invoice.put("EtsToken", etsToken);
        JsonObject result = post("/invoice", invoice);
        return result != null ? gson.fromJson(result, new TypeToken<Map<String, Object>>() {}.getType()) : Map.of();
    }

    /**
     * Fatura durumunu sorgular.
     */
    public Map<String, Object> getInvoiceStatus(String uuid) throws IOException, InterruptedException {
        JsonObject result = get("/invoice/" + uuid + "/status");
        return result != null ? gson.fromJson(result, new TypeToken<Map<String, Object>>() {}.getType()) : Map.of();
    }

    // ==================== E-ARSIV ====================

    /**
     * E-Arsiv fatura gonderir.
     */
    public Map<String, Object> sendEArchive(Map<String, Object> invoice, String sendType) throws IOException, InterruptedException {
        invoice.put("EtsToken", etsToken);
        invoice.put("ArchiveInfo", Map.of("SendType", sendType));
        JsonObject result = post("/earchive", invoice);
        return result != null ? gson.fromJson(result, new TypeToken<Map<String, Object>>() {}.getType()) : Map.of();
    }

    // ==================== DOVIZ KURU ====================

    /**
     * Doviz kurunu sorgular.
     */
    public Map<String, Object> getExchangeRate(String currency, String date) throws IOException, InterruptedException {
        JsonObject result = get("/currency/rate?currency=" + currency + "&date=" + date);
        return result != null ? gson.fromJson(result, new TypeToken<Map<String, Object>>() {}.getType()) : Map.of();
    }

    // ==================== PRIVATE METHODS ====================

    private JsonObject get(String endpoint) throws IOException, InterruptedException {
        String url = endpoint.contains("?")
                ? baseUrl + endpoint + "&EtsToken=" + etsToken
                : baseUrl + endpoint + "?EtsToken=" + etsToken;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        JsonObject result = gson.fromJson(response.body(), JsonObject.class);
        if (!result.get("Success").getAsBoolean()) {
            throw new RuntimeException("Request failed: " + result.get("Message").getAsString());
        }

        return result.getAsJsonObject("Data");
    }

    private JsonObject post(String endpoint, Map<String, Object> data) throws IOException, InterruptedException {
        Map<String, Object> requestData = new java.util.HashMap<>(data != null ? data : Map.of());
        requestData.put("EtsToken", etsToken);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + endpoint))
                .header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(requestData)))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        JsonObject result = gson.fromJson(response.body(), JsonObject.class);
        if (!result.get("Success").getAsBoolean()) {
            throw new RuntimeException("Request failed: " + result.get("Message").getAsString());
        }

        return result.has("Data") ? result.getAsJsonObject("Data") : null;
    }

    // ==================== MODELS ====================

    public static class EntegreId {
        public String PartyIdentificationId;
        public String Username;
        public String Password;
        public String SoftwareId;
        public String Integrator;

        public EntegreId(String partyId, String username, String password, String softwareId, String integrator) {
            this.PartyIdentificationId = partyId;
            this.Username = username;
            this.Password = password;
            this.SoftwareId = softwareId;
            this.Integrator = integrator;
        }
    }
}
