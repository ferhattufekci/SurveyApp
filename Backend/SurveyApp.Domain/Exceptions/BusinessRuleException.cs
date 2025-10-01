namespace SurveyApp.Domain.Exceptions;

/// <summary>
/// İş kuralı ihlallerini taşıyan yapısal exception.
/// Pipe-delimited string encoding'in yerini alır.
/// </summary>
public sealed class BusinessRuleException : Exception
{
    public int AffectedCount { get; }
    public string Detail     { get; }

    public BusinessRuleException(string message, int affectedCount, string detail)
        : base(message)
    {
        AffectedCount = affectedCount;
        Detail        = detail;
    }
}