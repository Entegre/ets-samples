#!/usr/bin/env python3
"""
Entegre ETS API Client - Python

API Endpoints:
  Test: https://ets-test.bulutix.com
  Live: https://ets.bulutix.com
"""

import requests
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from datetime import date, datetime
import json


@dataclass
class EntegreId:
    """Kimlik dogrulama bilgileri"""
    PartyIdentificationId: str  # VKN/TCKN
    Username: str
    Password: str
    SoftwareId: str
    Integrator: str  # UYM, UYK, IZI, DGN, MYS


@dataclass
class Address:
    """Adres bilgisi"""
    Country: str = "Turkiye"
    CityName: str = ""
    CitySubdivisionName: str = ""
    StreetName: str = ""
    BuildingNumber: str = ""
    PostalZone: str = ""


@dataclass
class Party:
    """Taraf bilgisi (Satici/Alici)"""
    PartyIdentification: str  # VKN/TCKN
    PartyName: str
    Address: Optional[Address] = None
    TaxOffice: str = ""
    Alias: str = ""


@dataclass
class DocumentLine:
    """Fatura kalemi"""
    ItemCode: str
    ItemName: str
    InvoicedQuantity: float
    UnitCode: str  # ADET, KG, LT, MT, M2, M3, vb.
    Price: float
    TaxCode: str = "0015"  # KDV
    TaxPercent: float = 20.0


@dataclass
class Invoice:
    """Fatura modeli"""
    InvoiceType: str  # SATIS, IADE, ISTISNA, TEVKIFAT, IHRACKAYITLI, OZELMATRAH
    ProfileId: str  # TEMELFATURA, TICARIFATURA, YOLCUBERABERFATURA, IHRACAT
    IssueDate: str
    Supplier: Party
    Customer: Party
    Lines: List[DocumentLine]
    Notes: List[str] = None
    CurrencyCode: str = "TRY"

    def __post_init__(self):
        if self.Notes is None:
            self.Notes = []


class EtsClient:
    """Entegre ETS API Client"""

    def __init__(self, base_url: str = "https://ets-test.bulutix.com"):
        self.base_url = base_url.rstrip('/')
        self.ets_token: Optional[str] = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

    def authenticate(self, entegre_id: EntegreId) -> str:
        """
        Kimlik dogrulama yapar ve EtsToken alir.

        Args:
            entegre_id: Kimlik bilgileri

        Returns:
            EtsToken string
        """
        url = f"{self.base_url}/auth/token"

        response = self.session.post(url, json=asdict(entegre_id))
        response.raise_for_status()

        result = response.json()
        if not result.get('Success'):
            raise Exception(f"Authentication failed: {result.get('Message')}")

        self.ets_token = result['Data']['EtsToken']
        return self.ets_token

    def _request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> Dict:
        """API istegi yapar"""
        if not self.ets_token:
            raise Exception("Not authenticated. Call authenticate() first.")

        url = f"{self.base_url}{endpoint}"

        # EtsToken'i request body'ye ekle
        if data is None:
            data = {}
        data['EtsToken'] = self.ets_token

        response = self.session.request(method, url, json=data, params=params)
        response.raise_for_status()

        return response.json()

    # ==================== E-FATURA ====================

    def check_einvoice_user(self, party_id: str) -> bool:
        """
        E-Fatura mukellefi mi sorgular.

        Args:
            party_id: VKN veya TCKN

        Returns:
            True ise mukellef
        """
        result = self._request('POST', f'/invoice/user/{party_id}')
        return result.get('Data', {}).get('IsActive', False)

    def get_user_aliases(self, party_id: str) -> List[Dict]:
        """
        Kullanici PK/GB alias listesini getirir.

        Args:
            party_id: VKN veya TCKN

        Returns:
            Alias listesi
        """
        result = self._request('POST', f'/invoice/user/{party_id}/alias')
        return result.get('Data', {}).get('Aliases', [])

    def send_invoice(self, invoice: Invoice, target_alias: str = None) -> Dict:
        """
        E-Fatura gonderir.

        Args:
            invoice: Fatura modeli
            target_alias: Alici alias (opsiyonel)

        Returns:
            Fatura ID ve UUID bilgisi
        """
        data = {
            'Invoice': self._build_invoice_data(invoice),
            'TargetCustomer': {
                'Alias': target_alias or f"urn:mail:defaultpk@{invoice.Customer.PartyIdentification}"
            }
        }

        result = self._request('POST', '/invoice', data)
        return result.get('Data', {})

    def send_draft_invoice(self, invoice: Invoice) -> Dict:
        """Taslak fatura gonderir."""
        data = {
            'Invoice': self._build_invoice_data(invoice)
        }

        result = self._request('POST', '/invoice/draft', data)
        return result.get('Data', {})

    def get_invoice_status(self, uuid: str) -> Dict:
        """
        Fatura durumunu sorgular.

        Args:
            uuid: Fatura UUID

        Returns:
            Durum bilgisi
        """
        result = self._request('GET', f'/invoice/{uuid}/status')
        return result.get('Data', {})

    def respond_invoice(self, uuid: str, response_type: str, description: str = "") -> Dict:
        """
        Faturaya yanit verir (Kabul/Red).

        Args:
            uuid: Fatura UUID
            response_type: KABUL veya RED
            description: Aciklama

        Returns:
            Yanit sonucu
        """
        data = {
            'ResponseType': response_type,
            'Description': description
        }

        result = self._request('POST', f'/invoice/{uuid}/respond', data)
        return result.get('Data', {})

    def get_inbox_invoices(self, start_date: str, end_date: str) -> List[Dict]:
        """
        Gelen faturalari listeler.

        Args:
            start_date: Baslangic tarihi (YYYY-MM-DD)
            end_date: Bitis tarihi (YYYY-MM-DD)

        Returns:
            Fatura listesi
        """
        data = {
            'StartDate': start_date,
            'EndDate': end_date
        }

        result = self._request('POST', '/invoice/inbox', data)
        return result.get('Data', [])

    # ==================== E-ARSIV ====================

    def send_earchive(self, invoice: Invoice, send_type: str = "KAGIT") -> Dict:
        """
        E-Arsiv fatura gonderir.

        Args:
            invoice: Fatura modeli
            send_type: KAGIT veya ELEKTRONIK

        Returns:
            Fatura ID ve UUID bilgisi
        """
        data = {
            'Invoice': self._build_invoice_data(invoice),
            'ArchiveInfo': {
                'SendType': send_type
            }
        }

        result = self._request('POST', '/earchive', data)
        return result.get('Data', {})

    def get_earchive_status(self, uuid: str) -> Dict:
        """E-Arsiv fatura durumunu sorgular."""
        result = self._request('GET', f'/earchive/{uuid}/status')
        return result.get('Data', {})

    def get_earchive_pdf(self, uuid: str) -> bytes:
        """E-Arsiv fatura PDF'ini indirir."""
        if not self.ets_token:
            raise Exception("Not authenticated. Call authenticate() first.")

        url = f"{self.base_url}/earchive/{uuid}/pdf"
        response = self.session.get(url, params={'EtsToken': self.ets_token})
        response.raise_for_status()
        return response.content

    def cancel_earchive(self, uuid: str) -> Dict:
        """E-Arsiv faturayi iptal eder."""
        result = self._request('POST', f'/earchive/{uuid}/cancel')
        return result.get('Data', {})

    # ==================== E-IRSALIYE ====================

    def check_edispatch_user(self, party_id: str) -> bool:
        """E-Irsaliye mukellefi mi sorgular."""
        result = self._request('POST', f'/dispatch/user/{party_id}')
        return result.get('Data', {}).get('IsActive', False)

    def send_dispatch(self, dispatch_data: Dict) -> Dict:
        """E-Irsaliye gonderir."""
        result = self._request('POST', '/dispatch', dispatch_data)
        return result.get('Data', {})

    def get_dispatch_status(self, uuid: str) -> Dict:
        """E-Irsaliye durumunu sorgular."""
        result = self._request('GET', f'/dispatch/{uuid}/status')
        return result.get('Data', {})

    # ==================== MUSTAHSIL MAKBUZU ====================

    def send_producer_receipt(self, receipt_data: Dict) -> Dict:
        """Mustahsil makbuzu gonderir."""
        result = self._request('POST', '/producer-receipt', receipt_data)
        return result.get('Data', {})

    def get_producer_receipt_status(self, uuid: str) -> Dict:
        """Mustahsil makbuzu durumunu sorgular."""
        result = self._request('GET', f'/producer-receipt/{uuid}/status')
        return result.get('Data', {})

    # ==================== E-SMM ====================

    def send_voucher(self, voucher_data: Dict) -> Dict:
        """E-SMM (Serbest Meslek Makbuzu) gonderir."""
        result = self._request('POST', '/voucher', voucher_data)
        return result.get('Data', {})

    def get_voucher_status(self, uuid: str) -> Dict:
        """E-SMM durumunu sorgular."""
        result = self._request('GET', f'/voucher/{uuid}/status')
        return result.get('Data', {})

    # ==================== DOVIZ KURU ====================

    def get_exchange_rate(self, currency: str, date: str) -> Dict:
        """
        Doviz kurunu sorgular.

        Args:
            currency: Para birimi kodu (USD, EUR, GBP, vb.)
            date: Tarih (YYYY-MM-DD)

        Returns:
            Kur bilgisi
        """
        result = self._request('GET', '/currency/rate', params={
            'currency': currency,
            'date': date
        })
        return result.get('Data', {})

    # ==================== HELPER METHODS ====================

    def _build_invoice_data(self, invoice: Invoice) -> Dict:
        """Invoice objesini API formatina donusturur."""
        lines = []
        for line in invoice.Lines:
            line_amount = line.InvoicedQuantity * line.Price
            tax_amount = line_amount * line.TaxPercent / 100

            lines.append({
                'ItemCode': line.ItemCode,
                'ItemName': line.ItemName,
                'InvoicedQuantity': line.InvoicedQuantity,
                'IsoUnitCode': line.UnitCode,
                'Price': line.Price,
                'LineExtensionAmount': line_amount,
                'Taxes': [{
                    'TaxCode': line.TaxCode,
                    'TaxName': 'KDV',
                    'Percent': line.TaxPercent,
                    'TaxAmount': tax_amount
                }]
            })

        # Toplam hesapla
        line_total = sum(l['LineExtensionAmount'] for l in lines)
        tax_total = sum(l['Taxes'][0]['TaxAmount'] for l in lines)

        return {
            'InvoiceTypeCode': invoice.InvoiceType,
            'ProfileId': invoice.ProfileId,
            'IssueDate': invoice.IssueDate,
            'DocumentCurrencyCode': invoice.CurrencyCode,
            'Notes': invoice.Notes,
            'Supplier': {
                'PartyIdentification': invoice.Supplier.PartyIdentification,
                'PartyName': invoice.Supplier.PartyName,
                'TaxOffice': invoice.Supplier.TaxOffice,
                'Address': asdict(invoice.Supplier.Address) if invoice.Supplier.Address else None
            },
            'Customer': {
                'PartyIdentification': invoice.Customer.PartyIdentification,
                'PartyName': invoice.Customer.PartyName,
                'TaxOffice': invoice.Customer.TaxOffice,
                'Address': asdict(invoice.Customer.Address) if invoice.Customer.Address else None
            },
            'Lines': lines,
            'LineExtensionAmount': line_total,
            'TaxExclusiveAmount': line_total,
            'TaxInclusiveAmount': line_total + tax_total,
            'PayableAmount': line_total + tax_total,
            'TaxTotal': {
                'TaxAmount': tax_total,
                'TaxSubtotals': [{
                    'TaxCode': '0015',
                    'TaxName': 'KDV',
                    'TaxableAmount': line_total,
                    'TaxAmount': tax_total,
                    'Percent': 20.0
                }]
            }
        }


def main():
    """Ornek kullanim"""
    print("=== Entegre ETS API Ornegi (Python) ===\n")

    # Client olustur
    client = EtsClient("https://ets-test.bulutix.com")

    # Kimlik bilgileri
    credentials = EntegreId(
        PartyIdentificationId="1234567890",  # VKN
        Username="test_user",
        Password="test_pass",
        SoftwareId="ETS-PYTHON-SAMPLE",
        Integrator="UYM"  # Uyumsoft
    )

    try:
        # 1. Authenticate
        print("1. Kimlik dogrulama yapiliyor...")
        token = client.authenticate(credentials)
        print(f"   EtsToken alindi: {token[:30]}...\n")

        # 2. E-Fatura mukellefi sorgula
        print("2. E-Fatura mukellefi sorgulaniyor...")
        vkn = "1234567890"
        is_active = client.check_einvoice_user(vkn)
        print(f"   VKN {vkn} e-fatura mukellefi: {is_active}\n")

        # 3. Alias sorgula
        print("3. Alias listesi aliniyor...")
        aliases = client.get_user_aliases(vkn)
        print(f"   Bulunan alias sayisi: {len(aliases)}")
        for alias in aliases:
            print(f"      - {alias.get('Alias')} ({alias.get('Type')})")
        print()

        # 4. Ornek fatura olustur
        print("4. Fatura gonderiliyor...")
        invoice = Invoice(
            InvoiceType="SATIS",
            ProfileId="TEMELFATURA",
            IssueDate=date.today().isoformat(),
            Supplier=Party(
                PartyIdentification="1234567890",
                PartyName="Test Satici Ltd. Sti.",
                TaxOffice="Test VD",
                Address=Address(
                    CityName="Istanbul",
                    CitySubdivisionName="Kadikoy",
                    StreetName="Test Sokak No:1"
                )
            ),
            Customer=Party(
                PartyIdentification="9876543210",
                PartyName="Test Alici A.S.",
                TaxOffice="Test VD",
                Address=Address(
                    CityName="Ankara",
                    CitySubdivisionName="Cankaya",
                    StreetName="Ornek Caddesi No:5"
                )
            ),
            Lines=[
                DocumentLine(
                    ItemCode="URUN001",
                    ItemName="Test Urun",
                    InvoicedQuantity=10,
                    UnitCode="ADET",
                    Price=100.00,
                    TaxPercent=20.0
                )
            ],
            Notes=["Bu bir test faturasidir."]
        )

        result = client.send_invoice(invoice)
        invoice_uuid = result.get('Uuid')
        print(f"   Fatura gonderildi!")
        print(f"   UUID: {invoice_uuid}")
        print(f"   Numara: {result.get('Number')}\n")

        # 5. Durum sorgula
        if invoice_uuid:
            print("5. Fatura durumu sorgulaniyor...")
            status = client.get_invoice_status(invoice_uuid)
            print(f"   Durum: {status.get('Status')}\n")

        # 6. Doviz kuru sorgula
        print("6. Doviz kuru sorgulaniyor...")
        rate = client.get_exchange_rate("USD", date.today().isoformat())
        print(f"   1 USD = {rate.get('Rate')} TRY\n")

        print("=== Islemler tamamlandi ===")

    except requests.exceptions.RequestException as e:
        print(f"HTTP Hatasi: {e}")
    except Exception as e:
        print(f"Hata: {e}")


if __name__ == "__main__":
    main()
