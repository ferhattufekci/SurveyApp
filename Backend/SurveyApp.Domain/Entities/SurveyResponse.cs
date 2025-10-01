namespace SurveyApp.Domain.Entities;

public class SurveyResponse
{
    public int Id { get; set; }
    public int SurveyId { get; set; }
    public int UserId { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public Survey Survey { get; set; } = null!;
    public User User { get; set; } = null!;
    public ICollection<SurveyAnswer> Answers { get; set; } = new List<SurveyAnswer>();
}

public class SurveyAnswer
{
    public int Id { get; set; }
    public int SurveyResponseId { get; set; }
    public int QuestionId { get; set; }
    public int AnswerOptionId { get; set; }

    public SurveyResponse SurveyResponse { get; set; } = null!;
    public Question Question { get; set; } = null!;
    public AnswerOption AnswerOption { get; set; } = null!;
}
