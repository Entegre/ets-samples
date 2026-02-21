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
    invoice = {
      'Invoice' => {
        'InvoiceTypeCode' => 'SATIS',
        'ProfileId' => 'TEMELFATURA',
        'IssueDate' => Date.today.to_s,
        'DocumentCurrencyCode' => 'TRY',
        'Notes' => ['Bu bir test faturasidir.'],
        'Supplier' => {
          'PartyIdentification' => '1234567890',
          'PartyName' => 'Test Satici Ltd. Sti.',
          'TaxOffice' => 'Test VD'
        },
        'Customer' => {
          'PartyIdentification' => '9876543210',
          'PartyName' => 'Test Alici A.S.',
          'TaxOffice' => 'Test VD'
        },
        'Lines' => [{
          'ItemCode' => 'URUN001',
          'ItemName' => 'Test Urun',
          'InvoicedQuantity' => 10,
          'IsoUnitCode' => 'ADET',
          'Price' => 100,
          'LineExtensionAmount' => 1000,
          'Taxes' => [{ 'TaxCode' => '0015', 'TaxName' => 'KDV', 'Percent' => 20, 'TaxAmount' => 200 }]
        }],
        'LineExtensionAmount' => 1000,
        'TaxExclusiveAmount' => 1000,
        'TaxInclusiveAmount' => 1200,
        'PayableAmount' => 1200
      },
      'TargetCustomer' => { 'Alias' => 'urn:mail:defaultpk@9876543210' }
    }

    result = client.send_invoice(invoice)
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
