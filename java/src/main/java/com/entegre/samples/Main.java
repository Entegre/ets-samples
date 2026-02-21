package com.entegre.samples;

import java.text.NumberFormat;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        System.out.println("=== Entegre ETS API Ornegi (Java) ===\n");

        EtsClient client = new EtsClient("https://ets-test.bulutix.com");
        NumberFormat nf = NumberFormat.getNumberInstance(new Locale("tr", "TR"));

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

            // Fatura kalemleri
            List<Map<String, Object>> lines = new ArrayList<>();

            // Kalem 1: Yazilim Lisansi
            Map<String, Object> line1 = new HashMap<>();
            line1.put("ItemCode", "YZL-001");
            line1.put("ItemName", "ERP Yazilim Lisansi (Yillik)");
            line1.put("InvoicedQuantity", 1);
            line1.put("IsoUnitCode", "ADET");
            line1.put("Price", 50000);
            line1.put("LineExtensionAmount", 50000);
            line1.put("Taxes", List.of(Map.of(
                    "TaxCode", "0015", "TaxName", "KDV", "Percent", 20, "TaxAmount", 10000
            )));
            lines.add(line1);

            // Kalem 2: Teknik Destek
            Map<String, Object> line2 = new HashMap<>();
            line2.put("ItemCode", "DST-001");
            line2.put("ItemName", "Teknik Destek Hizmeti (12 Ay)");
            line2.put("InvoicedQuantity", 12);
            line2.put("IsoUnitCode", "ADET");
            line2.put("Price", 2500);
            line2.put("LineExtensionAmount", 30000);
            line2.put("Taxes", List.of(Map.of(
                    "TaxCode", "0015", "TaxName", "KDV", "Percent", 20, "TaxAmount", 6000
            )));
            lines.add(line2);

            // Kalem 3: Egitim
            Map<String, Object> line3 = new HashMap<>();
            line3.put("ItemCode", "EGT-001");
            line3.put("ItemName", "Kullanici Egitimi (Kisi/Gun)");
            line3.put("InvoicedQuantity", 5);
            line3.put("IsoUnitCode", "ADET");
            line3.put("Price", 3000);
            line3.put("LineExtensionAmount", 15000);
            line3.put("Taxes", List.of(Map.of(
                    "TaxCode", "0015", "TaxName", "KDV", "Percent", 20, "TaxAmount", 3000
            )));
            lines.add(line3);

            // Toplamlar
            int lineTotal = 95000;  // 50000 + 30000 + 15000
            int taxTotal = 19000;   // 10000 + 6000 + 3000
            int grandTotal = lineTotal + taxTotal;

            // Fatura objesi
            Map<String, Object> invoiceData = new HashMap<>();
            invoiceData.put("InvoiceTypeCode", "SATIS");
            invoiceData.put("ProfileId", "TEMELFATURA");
            invoiceData.put("IssueDate", LocalDate.now().toString());
            invoiceData.put("DocumentCurrencyCode", "TRY");
            invoiceData.put("Notes", List.of(
                    "Bu fatura elektronik olarak olusturulmustur.",
                    "Odeme vadesi: 30 gun",
                    "IBAN: TR00 0000 0000 0000 0000 0000 00"
            ));
            invoiceData.put("Supplier", Map.of(
                    "PartyIdentification", "1234567890",
                    "PartyName", "Ornek Teknoloji A.S.",
                    "TaxOffice", "Kadikoy VD",
                    "Address", Map.of(
                            "Country", "Turkiye",
                            "CityName", "Istanbul",
                            "CitySubdivisionName", "Kadikoy",
                            "StreetName", "Bagdat Caddesi No:123",
                            "BuildingNumber", "123",
                            "PostalZone", "34710"
                    )
            ));
            invoiceData.put("Customer", Map.of(
                    "PartyIdentification", "9876543210",
                    "PartyName", "ABC Yazilim Ltd. Sti.",
                    "TaxOffice", "Cankaya VD",
                    "Address", Map.of(
                            "Country", "Turkiye",
                            "CityName", "Ankara",
                            "CitySubdivisionName", "Cankaya",
                            "StreetName", "Ataturk Bulvari No:456",
                            "BuildingNumber", "456",
                            "PostalZone", "06690"
                    )
            ));
            invoiceData.put("Lines", lines);
            invoiceData.put("LineExtensionAmount", lineTotal);
            invoiceData.put("TaxExclusiveAmount", lineTotal);
            invoiceData.put("TaxInclusiveAmount", grandTotal);
            invoiceData.put("PayableAmount", grandTotal);
            invoiceData.put("TaxTotal", Map.of(
                    "TaxAmount", taxTotal,
                    "TaxSubtotals", List.of(Map.of(
                            "TaxCode", "0015",
                            "TaxName", "KDV",
                            "TaxableAmount", lineTotal,
                            "TaxAmount", taxTotal,
                            "Percent", 20
                    ))
            ));

            Map<String, Object> invoice = new HashMap<>();
            invoice.put("Invoice", invoiceData);
            invoice.put("TargetCustomer", Map.of("Alias", "urn:mail:defaultpk@9876543210"));

            // Fatura ozeti
            System.out.println("   Fatura Detaylari:");
            System.out.println("   - Kalem Sayisi: " + lines.size());
            System.out.println("   - Ara Toplam: " + nf.format(lineTotal) + " TRY");
            System.out.println("   - KDV (%20): " + nf.format(taxTotal) + " TRY");
            System.out.println("   - Genel Toplam: " + nf.format(grandTotal) + " TRY");

            Map<String, Object> result = client.sendInvoice(invoice);
            System.out.println("\n   Fatura gonderildi!");
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
