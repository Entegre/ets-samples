using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Entegre.Ets.Samples;

/// <summary>
/// Entegre ETS API Client
/// </summary>
public class EtsClient : IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;
    private string? _etsToken;

    public EtsClient(string baseUrl = "https://ets-test.bulutix.com")
    {
        _baseUrl = baseUrl.TrimEnd('/');
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(_baseUrl)
        };
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
    }

    /// <summary>
    /// Kimlik dogrulama yapar ve EtsToken alir.
    /// </summary>
    public async Task<string> AuthenticateAsync(EntegreId entegreId)
    {
        var response = await _httpClient.PostAsJsonAsync("/auth/token", entegreId);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<ResponseModel<EntegreIdResponse>>();

        if (result?.Success != true)
            throw new Exception($"Authentication failed: {result?.Message}");

        _etsToken = result.Data?.EtsToken
            ?? throw new Exception("EtsToken not received");

        return _etsToken;
    }

    #region E-Fatura

    /// <summary>
    /// E-Fatura mukellefi mi sorgular.
    /// </summary>
    public async Task<bool> CheckEInvoiceUserAsync(string partyId)
    {
        var result = await PostAsync<InvoiceUserResponse>($"/invoice/user/{partyId}");
        return result?.IsActive ?? false;
    }

    /// <summary>
    /// Kullanici alias listesini getirir.
    /// </summary>
    public async Task<List<UserAlias>> GetUserAliasesAsync(string partyId)
    {
        var result = await PostAsync<UserAliasResponse>($"/invoice/user/{partyId}/alias");
        return result?.Aliases ?? new List<UserAlias>();
    }

    /// <summary>
    /// E-Fatura gonderir.
    /// </summary>
    public async Task<InvoiceResult> SendInvoiceAsync(InvoiceModel invoice)
    {
        invoice.EtsToken = _etsToken;
        var result = await PostAsync<InvoiceResult>("/invoice", invoice);
        return result ?? new InvoiceResult();
    }

    /// <summary>
    /// Taslak fatura gonderir.
    /// </summary>
    public async Task<InvoiceResult> SendDraftInvoiceAsync(InvoiceModel invoice)
    {
        invoice.EtsToken = _etsToken;
        var result = await PostAsync<InvoiceResult>("/invoice/draft", invoice);
        return result ?? new InvoiceResult();
    }

    /// <summary>
    /// Fatura durumunu sorgular.
    /// </summary>
    public async Task<InvoiceStatus> GetInvoiceStatusAsync(string uuid)
    {
        var result = await GetAsync<InvoiceStatus>($"/invoice/{uuid}/status");
        return result ?? new InvoiceStatus();
    }

    /// <summary>
    /// Faturaya yanit verir (Kabul/Red).
    /// </summary>
    public async Task<InvoiceResult> RespondInvoiceAsync(string uuid, string responseType, string description = "")
    {
        var data = new
        {
            EtsToken = _etsToken,
            ResponseType = responseType,
            Description = description
        };

        var result = await PostAsync<InvoiceResult>($"/invoice/{uuid}/respond", data);
        return result ?? new InvoiceResult();
    }

    /// <summary>
    /// Gelen faturalari listeler.
    /// </summary>
    public async Task<List<InboxInvoice>> GetInboxInvoicesAsync(string startDate, string endDate)
    {
        var data = new
        {
            EtsToken = _etsToken,
            StartDate = startDate,
            EndDate = endDate
        };

        var result = await PostAsync<List<InboxInvoice>>("/invoice/inbox", data);
        return result ?? new List<InboxInvoice>();
    }

    #endregion

    #region E-Arsiv

    /// <summary>
    /// E-Arsiv fatura gonderir.
    /// </summary>
    public async Task<InvoiceResult> SendEArchiveAsync(InvoiceModel invoice, string sendType = "KAGIT")
    {
        invoice.EtsToken = _etsToken;
        invoice.ArchiveInfo = new ArchiveInfo { SendType = sendType };

        var result = await PostAsync<InvoiceResult>("/earchive", invoice);
        return result ?? new InvoiceResult();
    }

    /// <summary>
    /// E-Arsiv fatura durumunu sorgular.
    /// </summary>
    public async Task<InvoiceStatus> GetEArchiveStatusAsync(string uuid)
    {
        var result = await GetAsync<InvoiceStatus>($"/earchive/{uuid}/status");
        return result ?? new InvoiceStatus();
    }

    /// <summary>
    /// E-Arsiv faturayi iptal eder.
    /// </summary>
    public async Task<InvoiceResult> CancelEArchiveAsync(string uuid)
    {
        var result = await PostAsync<InvoiceResult>($"/earchive/{uuid}/cancel");
        return result ?? new InvoiceResult();
    }

    #endregion

    #region E-Irsaliye

    /// <summary>
    /// E-Irsaliye mukellefi mi sorgular.
    /// </summary>
    public async Task<bool> CheckEDispatchUserAsync(string partyId)
    {
        var result = await PostAsync<InvoiceUserResponse>($"/dispatch/user/{partyId}");
        return result?.IsActive ?? false;
    }

    /// <summary>
    /// E-Irsaliye gonderir.
    /// </summary>
    public async Task<InvoiceResult> SendDispatchAsync(DispatchModel dispatch)
    {
        dispatch.EtsToken = _etsToken;
        var result = await PostAsync<InvoiceResult>("/dispatch", dispatch);
        return result ?? new InvoiceResult();
    }

    /// <summary>
    /// E-Irsaliye durumunu sorgular.
    /// </summary>
    public async Task<InvoiceStatus> GetDispatchStatusAsync(string uuid)
    {
        var result = await GetAsync<InvoiceStatus>($"/dispatch/{uuid}/status");
        return result ?? new InvoiceStatus();
    }

    #endregion

    #region Doviz Kuru

    /// <summary>
    /// Doviz kurunu sorgular.
    /// </summary>
    public async Task<ExchangeRate> GetExchangeRateAsync(string currency, string date)
    {
        var result = await GetAsync<ExchangeRate>($"/currency/rate?currency={currency}&date={date}");
        return result ?? new ExchangeRate();
    }

    #endregion

    #region Private Methods

    private async Task<T?> GetAsync<T>(string endpoint)
    {
        var url = endpoint.Contains("?")
            ? $"{endpoint}&EtsToken={_etsToken}"
            : $"{endpoint}?EtsToken={_etsToken}";

        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<ResponseModel<T>>();

        if (result?.Success != true)
            throw new Exception($"Request failed: {result?.Message}");

        return result.Data;
    }

    private async Task<T?> PostAsync<T>(string endpoint, object? data = null)
    {
        var requestData = data ?? new { EtsToken = _etsToken };

        if (data != null && data.GetType().GetProperty("EtsToken") == null)
        {
            var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(
                JsonSerializer.Serialize(data));
            dict!["EtsToken"] = _etsToken!;
            requestData = dict;
        }

        var response = await _httpClient.PostAsJsonAsync(endpoint, requestData);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<ResponseModel<T>>();

        if (result?.Success != true)
            throw new Exception($"Request failed: {result?.Message}");

        return result.Data;
    }

    #endregion

    public void Dispose()
    {
        _httpClient.Dispose();
    }
}

#region Models

public class EntegreId
{
    public string PartyIdentificationId { get; set; } = "";
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string SoftwareId { get; set; } = "";
    public string Integrator { get; set; } = "";
}

public class EntegreIdResponse
{
    public string? EtsToken { get; set; }
}

public class ResponseModel<T>
{
    public T? Data { get; set; }
    public string? Message { get; set; }
    public bool Success { get; set; }
}

public class InvoiceUserResponse
{
    public bool IsActive { get; set; }
}

public class UserAliasResponse
{
    public List<UserAlias>? Aliases { get; set; }
}

public class UserAlias
{
    public string? Alias { get; set; }
    public string? Type { get; set; }
    public DateTime? RegisterDate { get; set; }
}

public class InvoiceModel
{
    public string? EtsToken { get; set; }
    public Invoice? Invoice { get; set; }
    public TargetCustomer? TargetCustomer { get; set; }
    public ArchiveInfo? ArchiveInfo { get; set; }
}

public class Invoice
{
    public string InvoiceTypeCode { get; set; } = "SATIS";
    public string ProfileId { get; set; } = "TEMELFATURA";
    public string? IssueDate { get; set; }
    public string DocumentCurrencyCode { get; set; } = "TRY";
    public List<string>? Notes { get; set; }
    public Party? Supplier { get; set; }
    public Party? Customer { get; set; }
    public List<DocumentLine>? Lines { get; set; }
    public decimal LineExtensionAmount { get; set; }
    public decimal TaxExclusiveAmount { get; set; }
    public decimal TaxInclusiveAmount { get; set; }
    public decimal PayableAmount { get; set; }
    public TaxTotal? TaxTotal { get; set; }
}

public class Party
{
    public string? PartyIdentification { get; set; }
    public string? PartyName { get; set; }
    public string? TaxOffice { get; set; }
    public string? Alias { get; set; }
    public Address? Address { get; set; }
}

public class Address
{
    public string Country { get; set; } = "Turkiye";
    public string? CityName { get; set; }
    public string? CitySubdivisionName { get; set; }
    public string? StreetName { get; set; }
    public string? BuildingNumber { get; set; }
    public string? PostalZone { get; set; }
}

public class DocumentLine
{
    public string? ItemCode { get; set; }
    public string? ItemName { get; set; }
    public decimal InvoicedQuantity { get; set; }
    public string IsoUnitCode { get; set; } = "ADET";
    public decimal Price { get; set; }
    public decimal LineExtensionAmount { get; set; }
    public List<Tax>? Taxes { get; set; }
}

public class Tax
{
    public string TaxCode { get; set; } = "0015";
    public string TaxName { get; set; } = "KDV";
    public decimal Percent { get; set; } = 20;
    public decimal TaxAmount { get; set; }
}

public class TaxTotal
{
    public decimal TaxAmount { get; set; }
    public List<TaxSubtotal>? TaxSubtotals { get; set; }
}

public class TaxSubtotal
{
    public string TaxCode { get; set; } = "0015";
    public string TaxName { get; set; } = "KDV";
    public decimal TaxableAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal Percent { get; set; }
}

public class TargetCustomer
{
    public string? Alias { get; set; }
}

public class ArchiveInfo
{
    public string SendType { get; set; } = "KAGIT";
}

public class InvoiceResult
{
    public string? Uuid { get; set; }
    public string? Number { get; set; }
    public string? Code { get; set; }
    public string? Message { get; set; }
}

public class InvoiceStatus
{
    public string? Status { get; set; }
    public string? StatusCode { get; set; }
    public DateTime? StatusDate { get; set; }
}

public class InboxInvoice
{
    public string? Uuid { get; set; }
    public string? Number { get; set; }
    public string? SenderVkn { get; set; }
    public string? SenderName { get; set; }
    public DateTime? IssueDate { get; set; }
    public decimal? PayableAmount { get; set; }
}

public class DispatchModel
{
    public string? EtsToken { get; set; }
    public object? Dispatch { get; set; }
    public TargetCustomer? TargetCustomer { get; set; }
}

public class ExchangeRate
{
    public string? Currency { get; set; }
    public decimal? Rate { get; set; }
    public string? Date { get; set; }
}

#endregion
