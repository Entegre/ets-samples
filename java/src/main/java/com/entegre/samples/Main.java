package com.entegre.samples;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        System.out.println("=== Entegre ETS API Ornegi (Java) ===\n");

        EtsClient client = new EtsClient("https://ets-test.entegre.net");

        try {
            // 1. Kimlik dogrulama
            System.out.println("1. Kimlik dogrulama yapiliyor...");
            String token = client.authenticate(new EtsClient.EntegreId(
                    "1234567890",
                    "test_user",
                    "test_pass",
                    "ETS-JAVA-SAMPLE",
                    "UYM"
            ));
            System.out.println("   EtsToken alindi: " + token.substring(0, 30) + "...\n");

            // 2. E-Fatura mukellefi sorgula
            System.out.println("2. E-Fatura mukellefi sorgulaniyor...");
            String vkn = "1234567890";
            boolean isActive = client.checkEInvoiceUser(vkn);
            System.out.println("   VKN " + vkn + " e-fatura mukellefi: " + isActive + "\n");

            // 3. Alias listesi al
            System.out.println("3. Alias listesi aliniyor...");
            List<Map<String, Object>> aliases = client.getUserAliases(vkn);
            System.out.println("   Bulunan alias sayisi: " + aliases.size());
            for (Map<String, Object> alias : aliases) {
                System.out.println("      - " + alias.get("Alias") + " (" + alias.get("Type") + ")");
            }
            System.out.println();

            // 4. Fatura olustur ve gonder
            System.out.println("4. Fatura gonderiliyor...");
            Map<String, Object> invoice = Map.of(
                    "Invoice", Map.of(
                            "InvoiceTypeCode", "SATIS",
                            "ProfileId", "TEMELFATURA",
                            "IssueDate", LocalDate.now().toString(),
                            "DocumentCurrencyCode", "TRY",
                            "Notes", List.of("Bu bir test faturasidir."),
                            "Supplier", Map.of(
                                    "PartyIdentification", "1234567890",
                                    "PartyName", "Test Satici Ltd. Sti.",
                                    "TaxOffice", "Test VD"
                            ),
                            "Customer", Map.of(
                                    "PartyIdentification", "9876543210",
                                    "PartyName", "Test Alici A.S.",
                                    "TaxOffice", "Test VD"
                            ),
                            "Lines", List.of(Map.of(
                                    "ItemCode", "URUN001",
                                    "ItemName", "Test Urun",
                                    "InvoicedQuantity", 10,
                                    "IsoUnitCode", "ADET",
                                    "Price", 100,
                                    "LineExtensionAmount", 1000,
                                    "Taxes", List.of(Map.of(
                                            "TaxCode", "0015",
                                            "TaxName", "KDV",
                                            "Percent", 20,
                                            "TaxAmount", 200
                                    ))
                            )),
                            "LineExtensionAmount", 1000,
                            "TaxExclusiveAmount", 1000,
                            "TaxInclusiveAmount", 1200,
                            "PayableAmount", 1200
                    ),
                    "TargetCustomer", Map.of("Alias", "urn:mail:defaultpk@9876543210")
            );

            Map<String, Object> result = client.sendInvoice(new java.util.HashMap<>(invoice));
            System.out.println("   Fatura gonderildi!");
            System.out.println("   UUID: " + result.get("Uuid"));
            System.out.println("   Numara: " + result.get("Number") + "\n");

            // 5. Durum sorgula
            if (result.get("Uuid") != null) {
                System.out.println("5. Fatura durumu sorgulaniyor...");
                Map<String, Object> status = client.getInvoiceStatus(result.get("Uuid").toString());
                System.out.println("   Durum: " + status.get("Status") + "\n");
            }

            // 6. Doviz kuru sorgula
            System.out.println("6. Doviz kuru sorgulaniyor...");
            Map<String, Object> rate = client.getExchangeRate("USD", LocalDate.now().toString());
            System.out.println("   1 USD = " + rate.get("Rate") + " TRY\n");

            System.out.println("=== Islemler tamamlandi ===");

        } catch (Exception e) {
            System.err.println("Hata: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
