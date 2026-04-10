namespace SurveyApp.Domain.Entities;

public class AnswerTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
	
	// ── Soft Delete ───────────────────────────────────────────────────────────
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }

    public ICollection<AnswerOption> Options { get; set; } = new List<AnswerOption>();
    public ICollection<Question> Questions { get; set; } = new List<Question>();
}

public class AnswerOption
{
    public int Id { get; set; }
    public int AnswerTemplateId { get; set; }
    public string Text { get; set; } = string.Empty;
    public int OrderIndex { get; set; }

    public AnswerTemplate AnswerTemplate { get; set; } = null!;
    public ICollection<SurveyAnswer> SurveyAnswers { get; set; } = new List<SurveyAnswer>();
}
