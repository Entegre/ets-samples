#!/usr/bin/env ruby
# frozen_string_literal: true

require 'faraday'
require 'json'
require 'date'

# Entegre ETS API Client - Ruby
class EtsClient
  attr_reader :ets_token

  def initialize(base_url = 'https://ets-test.bulutix.com')
    @base_url = base_url.chomp('/')
    @ets_token = nil
    @conn = Faraday.new(url: @base_url) do |f|
      f.request :json
      f.response :json
      f.adapter Faraday.default_adapter
    end
  end

  # Kimlik dogrulama yapar ve EtsToken alir.
  def authenticate(entegre_id)
    response = @conn.post('/auth/token', entegre_id)
    result = response.body

    raise "Authentication failed: #{result['Message']}" unless result['Success']

    @ets_token = result.dig('Data', 'EtsToken')
    @ets_token
  end

  # ==================== E-FATURA ====================

  # E-Fatura mukellefi mi sorgular.
  def check_einvoice_user(party_id)
    result = post("/invoice/user/#{party_id}")
    result&.dig('IsActive') || false
  end

  # Kullanici alias listesini getirir.
  def get_user_aliases(party_id)
    result = post("/invoice/user/#{party_id}/alias")
    result&.dig('Aliases') || []
  end

  # E-Fatura gonderir.
  def send_invoice(invoice)
    invoice['EtsToken'] = @ets_token
    post('/invoice', invoice) || {}
  end

  # Taslak fatura gonderir.
  def send_draft_invoice(invoice)
    invoice['EtsToken'] = @ets_token
    post('/invoice/draft', invoice) || {}
  end

  # Fatura durumunu sorgular.
  def get_invoice_status(uuid)
    get("/invoice/#{uuid}/status") || {}
  end

  # Faturaya yanit verir (Kabul/Red).
  def respond_invoice(uuid, response_type, description = '')
    post("/invoice/#{uuid}/respond", {
      'ResponseType' => response_type,
      'Description' => description
    }) || {}
  end

  # ==================== E-ARSIV ====================

  # E-Arsiv fatura gonderir.
  def send_earchive(invoice, send_type = 'KAGIT')
    invoice['EtsToken'] = @ets_token
    invoice['ArchiveInfo'] = { 'SendType' => send_type }
    post('/earchive', invoice) || {}
  end

  # E-Arsiv fatura durumunu sorgular.
  def get_earchive_status(uuid)
    get("/earchive/#{uuid}/status") || {}
  end

  # E-Arsiv faturayi iptal eder.
  def cancel_earchive(uuid)
    post("/earchive/#{uuid}/cancel") || {}
  end

  # ==================== DOVIZ KURU ====================

  # Doviz kurunu sorgular.
  def get_exchange_rate(currency, date)
    get("/currency/rate?currency=#{currency}&date=#{date}") || {}
  end

  private

  def get(endpoint)
    url = endpoint.include?('?') ? "#{endpoint}&EtsToken=#{@ets_token}" : "#{endpoint}?EtsToken=#{@ets_token}"

    response = @conn.get(url)
    result = response.body

    raise "Request failed: #{result['Message']}" unless result['Success']

    result['Data']
  end

  def post(endpoint, data = {})
    data['EtsToken'] = @ets_token

    response = @conn.post(endpoint, data)
    result = response.body

    raise "Request failed: #{result['Message']}" unless result['Success']

    result['Data']
  end
end

# Ornek kullanim
if __FILE__ == $PROGRAM_NAME
  puts '=== Entegre ETS API Ornegi (Ruby) ==='
  puts

  client = EtsClient.new('https://ets-test.bulutix.com')

  begin
    # 1. Kimlik dogrulama
    puts '1. Kimlik dogrulama yapiliyor...'
    token = client.authenticate({
      'PartyIdentificationId' => '1234567890',
      'Username' => 'test_user',
      'Password' => 'test_pass',
      'SoftwareId' => 'ETS-RUBY-SAMPLE',
      'Integrator' => 'UYM'
    })
    puts "   EtsToken alindi: #{token[0, 30]}..."
    puts

    # 2. E-Fatura mukellefi sorgula
    puts '2. E-Fatura mukellefi sorgulaniyor...'
    vkn = '1234567890'
    is_active = client.check_einvoice_user(vkn)
    puts "   VKN #{vkn} e-fatura mukellefi: #{is_active}"
    puts

    # 3. Alias listesi al
    puts '3. Alias listesi aliniyor...'
    aliases = client.get_user_aliases(vkn)
    puts "   Bulunan alias sayisi: #{aliases.length}"
    aliases.each do |a|
      puts "      - #{a['Alias']} (#{a['Type']})"
    end
    puts

    # 4. Fatura olustur ve gonder
    puts '4. Fatura gonderiliyor...'

    # Fatura kalemleri
    lines = [
      {
        'ItemCode' => 'YZL-001',
        'ItemName' => 'ERP Yazilim Lisansi (Yillik)',
        'InvoicedQuantity' => 1,
        'IsoUnitCode' => 'ADET',
        'Price' => 50_000,
        'LineExtensionAmount' => 50_000,
        'Taxes' => [{ 'TaxCode' => '0015', 'TaxName' => 'KDV', 'Percent' => 20, 'TaxAmount' => 10_000 }]
      },
      {
        'ItemCode' => 'DST-001',
        'ItemName' => 'Teknik Destek Hizmeti (12 Ay)',
        'InvoicedQuantity' => 12,
        'IsoUnitCode' => 'ADET',
        'Price' => 2_500,
        'LineExtensionAmount' => 30_000,
        'Taxes' => [{ 'TaxCode' => '0015', 'TaxName' => 'KDV', 'Percent' => 20, 'TaxAmount' => 6_000 }]
      },
      {
        'ItemCode' => 'EGT-001',
        'ItemName' => 'Kullanici Egitimi (Kisi/Gun)',
        'InvoicedQuantity' => 5,
        'IsoUnitCode' => 'ADET',
        'Price' => 3_000,
        'LineExtensionAmount' => 15_000,
        'Taxes' => [{ 'TaxCode' => '0015', 'TaxName' => 'KDV', 'Percent' => 20, 'TaxAmount' => 3_000 }]
      }
    ]

    # Toplamlar
    line_total = lines.sum { |l| l['LineExtensionAmount'] }
    tax_total = lines.sum { |l| l['Taxes'][0]['TaxAmount'] }
    grand_total = line_total + tax_total

    invoice = {
      'Invoice' => {
        'InvoiceTypeCode' => 'SATIS',
        'ProfileId' => 'TEMELFATURA',
        'IssueDate' => Date.today.to_s,
        'DocumentCurrencyCode' => 'TRY',
        'Notes' => [
          'Bu fatura elektronik olarak olusturulmustur.',
          'Odeme vadesi: 30 gun',
          'IBAN: TR00 0000 0000 0000 0000 0000 00'
        ],
        'Supplier' => {
          'PartyIdentification' => '1234567890',
          'PartyName' => 'Ornek Teknoloji A.S.',
          'TaxOffice' => 'Kadikoy VD',
          'Address' => {
            'Country' => 'Turkiye',
            'CityName' => 'Istanbul',
            'CitySubdivisionName' => 'Kadikoy',
            'StreetName' => 'Bagdat Caddesi No:123',
            'BuildingNumber' => '123',
            'PostalZone' => '34710'
          }
        },
        'Customer' => {
          'PartyIdentification' => '9876543210',
          'PartyName' => 'ABC Yazilim Ltd. Sti.',
          'TaxOffice' => 'Cankaya VD',
          'Address' => {
            'Country' => 'Turkiye',
            'CityName' => 'Ankara',
            'CitySubdivisionName' => 'Cankaya',
            'StreetName' => 'Ataturk Bulvari No:456',
            'BuildingNumber' => '456',
            'PostalZone' => '06690'
          }
        },
        'Lines' => lines,
        'LineExtensionAmount' => line_total,
        'TaxExclusiveAmount' => line_total,
        'TaxInclusiveAmount' => grand_total,
        'PayableAmount' => grand_total,
        'TaxTotal' => {
          'TaxAmount' => tax_total,
          'TaxSubtotals' => [{
            'TaxCode' => '0015',
            'TaxName' => 'KDV',
            'TaxableAmount' => line_total,
            'TaxAmount' => tax_total,
            'Percent' => 20
          }]
        }
      },
      'TargetCustomer' => { 'Alias' => 'urn:mail:defaultpk@9876543210' }
    }

    # Fatura ozeti
    puts '   Fatura Detaylari:'
    puts "   - Kalem Sayisi: #{lines.length}"
    puts "   - Ara Toplam: #{format('%<amount>.2f', amount: line_total).gsub('.', ',')} TRY"
    puts "   - KDV (%20): #{format('%<amount>.2f', amount: tax_total).gsub('.', ',')} TRY"
    puts "   - Genel Toplam: #{format('%<amount>.2f', amount: grand_total).gsub('.', ',')} TRY"

    result = client.send_invoice(invoice)
    puts
    puts '   Fatura gonderildi!'
    puts "   UUID: #{result['Uuid']}"
    puts "   Numara: #{result['Number']}"
    puts

    # 5. Durum sorgula
    if result['Uuid']
      puts '5. Fatura durumu sorgulaniyor...'
      status = client.get_invoice_status(result['Uuid'])
      puts "   Durum: #{status['Status']}"
      puts
    end

    # 6. Doviz kuru sorgula
    puts '6. Doviz kuru sorgulaniyor...'
    rate = client.get_exchange_rate('USD', Date.today.to_s)
    puts "   1 USD = #{rate['Rate']} TRY"
    puts

    puts '=== Islemler tamamlandi ==='

  rescue StandardError => e
    puts "Hata: #{e.message}"
  end
end
