using Microsoft.Extensions.Logging;
using SurveyApp.Application.DTOs;
using SurveyApp.Application.Interfaces;
using SurveyApp.Domain.Entities;
using SurveyApp.Domain.Interfaces;

namespace SurveyApp.Application.Services;

public class QuestionService : IQuestionService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<QuestionService> _logger;

    public QuestionService(IUnitOfWork uow, ILogger<QuestionService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

    public async Task<List<QuestionListDto>> GetAllAsync()
    {
        var questions = await _uow.Questions.GetAllWithTemplatesAsync();
        var surveys = await _uow.Surveys.GetAllWithDetailsAsync();
        var usageCounts = surveys
            .SelectMany(s => s.SurveyQuestions.Select(sq => sq.QuestionId))
            .GroupBy(qId => qId)
            .ToDictionary(g => g.Key, g => g.Count());
        return questions.Select(q => new QuestionListDto(q.Id, q.Text, q.IsActive, q.AnswerTemplateId, q.AnswerTemplate.Name,
            usageCounts.GetValueOrDefault(q.Id, 0))).ToList();
    }

    public async Task<QuestionDto?> GetByIdAsync(int id)
    {
        var q = await _uow.Questions.GetWithTemplateAsync(id);
        return q == null ? null : MapToDto(q);
    }

    public async Task<QuestionDto> CreateAsync(CreateQuestionRequest request)
    {
        _ = await _uow.AnswerTemplates.GetWithOptionsAsync(request.AnswerTemplateId)
            ?? throw new ArgumentException("Answer template not found.");

        var existing = await _uow.Questions.GetAllWithTemplatesAsync();
        if (existing.Any(q => q.Text.Trim().ToLower() == request.Text.Trim().ToLower()))
            throw new ArgumentException("Bu soru metniyle zaten bir soru mevcut. Farklı bir metin giriniz.");

        var question = new Question
        {
            Text = request.Text,
            AnswerTemplateId = request.AnswerTemplateId,
            IsActive = request.IsActive
        };
        await _uow.Questions.AddAsync(question);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("Question created: {QuestionId}", question.Id);

        var created = await _uow.Questions.GetWithTemplateAsync(question.Id);
        return MapToDto(created!);
    }

    public async Task<QuestionDto?> UpdateAsync(int id, UpdateQuestionRequest request)
    {
        var q = await _uow.Questions.GetByIdAsync(id);
        if (q == null) return null;

        var existing = await _uow.Questions.GetAllWithTemplatesAsync();
        if (existing.Any(x => x.Id != id && x.Text.Trim().ToLower() == request.Text.Trim().ToLower()))
            throw new ArgumentException("Bu soru metniyle zaten bir soru mevcut. Farklı bir metin giriniz.");

        if (q.IsActive && !request.IsActive)
        {
            var surveys = await _uow.Surveys.GetAllWithDetailsAsync();
            var activeUsages = surveys.Where(s => s.IsActive && s.SurveyQuestions.Any(sq => sq.QuestionId == id)).ToList();
            if (activeUsages.Any())
            {
                var names = string.Join(", ", activeUsages.Take(3).Select(s =>
                    $"\"{s.Title.Substring(0, Math.Min(40, s.Title.Length))}{(s.Title.Length > 40 ? "..." : "")}\""));
                var more = activeUsages.Count > 3 ? $" ve {activeUsages.Count - 3} anket daha" : "";
                throw new InvalidOperationException(
                    $"Bu soru {activeUsages.Count} aktif ankette kullanılmaktadır. Pasife almadan önce bu anketleri pasife alınız.|{activeUsages.Count}|{names}{more}");
            }
        }

        q.Text = request.Text;
        q.AnswerTemplateId = request.AnswerTemplateId;
        q.IsActive = request.IsActive;
        q.UpdatedAt = DateTime.UtcNow;

        await _uow.Questions.UpdateAsync(q);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("Question updated: {QuestionId}", id);

        var updated = await _uow.Questions.GetWithTemplateAsync(id);
        return MapToDto(updated!);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var q = await _uow.Questions.GetByIdAsync(id);
        if (q == null) return false;

        var surveys = await _uow.Surveys.GetAllWithDetailsAsync();
        var usedInSurveys = surveys.Where(s => s.SurveyQuestions.Any(sq => sq.QuestionId == id)).ToList();
        if (usedInSurveys.Any())
        {
            var names = string.Join(", ", usedInSurveys.Take(3).Select(s =>
                $"\"{s.Title.Substring(0, Math.Min(40, s.Title.Length))}{(s.Title.Length > 40 ? "..." : "")}\""));
            var more = usedInSurveys.Count > 3 ? $" ve {usedInSurveys.Count - 3} anket daha" : "";
            throw new InvalidOperationException(
                $"Bu soru {usedInSurveys.Count} ankette kullanılmaktadır ve silinemez.|{usedInSurveys.Count}|{names}{more}");
        }

        await _uow.Questions.DeleteAsync(q);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("Question soft-deleted: {QuestionId}", id);
        return true;
    }

    private static QuestionDto MapToDto(Question q)
    {
        var t = q.AnswerTemplate;
        var templateDto = new AnswerTemplateDto(t.Id, t.Name, t.IsActive,
            t.Options.OrderBy(o => o.OrderIndex).Select(o => new AnswerOptionDto(o.Id, o.Text, o.OrderIndex)).ToList());
        return new QuestionDto(q.Id, q.Text, q.IsActive, templateDto);
    }
}