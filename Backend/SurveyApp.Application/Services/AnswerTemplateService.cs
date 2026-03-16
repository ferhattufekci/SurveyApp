using Microsoft.Extensions.Logging;
using SurveyApp.Application.DTOs;
using SurveyApp.Application.Interfaces;
using SurveyApp.Domain.Entities;
using SurveyApp.Domain.Exceptions;
using SurveyApp.Domain.Interfaces;

namespace SurveyApp.Application.Services;

public class AnswerTemplateService : IAnswerTemplateService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<AnswerTemplateService> _logger;

    public AnswerTemplateService(IUnitOfWork uow, ILogger<AnswerTemplateService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

    public async Task<List<AnswerTemplateDto>> GetAllAsync()
    {
        var templates = await _uow.AnswerTemplates.GetAllWithOptionsAsync();
        var questions = await _uow.Questions.GetAllWithTemplatesAsync();
        var usageCounts = questions.GroupBy(q => q.AnswerTemplateId).ToDictionary(g => g.Key, g => g.Count());
        return templates.Select(t => MapToDtoWithCount(t, usageCounts.GetValueOrDefault(t.Id, 0))).ToList();
    }

    public async Task<AnswerTemplateDto?> GetByIdAsync(int id)
    {
        var template = await _uow.AnswerTemplates.GetWithOptionsAsync(id);
        return template == null ? null : MapToDto(template);
    }

    public async Task<AnswerTemplateDto> CreateAsync(CreateAnswerTemplateRequest request)
    {
        if (request.Options.Count < 2 || request.Options.Count > 4)
            throw new ArgumentException("Option count must be between 2 and 4.");

        var existing = await _uow.AnswerTemplates.GetAllWithOptionsAsync();
        if (existing.Any(t => t.Name.Trim().ToLower() == request.Name.Trim().ToLower()))
            throw new ArgumentException($"'{request.Name}' adında bir şablon zaten mevcut. Farklı bir ad giriniz.");

        var template = new AnswerTemplate
        {
            Name = request.Name,
            IsActive = request.IsActive,
            Options = request.Options.Select((text, i) => new AnswerOption
            {
                Text = text,
                OrderIndex = i
            }).ToList()
        };

        await _uow.AnswerTemplates.AddAsync(template);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("Answer template created: {TemplateId} - {TemplateName}", template.Id, template.Name);

        var created = await _uow.AnswerTemplates.GetWithOptionsAsync(template.Id);
        return MapToDto(created!);
    }

    public async Task<AnswerTemplateDto?> UpdateAsync(int id, UpdateAnswerTemplateRequest request)
    {
        var template = await _uow.AnswerTemplates.GetWithOptionsAsync(id);
        if (template == null) return null;

        if (request.Options.Count < 2 || request.Options.Count > 4)
            throw new ArgumentException("Option count must be between 2 and 4.");

        var existing = await _uow.AnswerTemplates.GetAllWithOptionsAsync();
        if (existing.Any(t => t.Id != id && t.Name.Trim().ToLower() == request.Name.Trim().ToLower()))
            throw new ArgumentException($"'{request.Name}' adında bir şablon zaten mevcut. Farklı bir ad giriniz.");

        if (template.IsActive && !request.IsActive)
        {
            var questions = await _uow.Questions.GetAllWithTemplatesAsync();
            var activeUsages = questions.Where(q => q.AnswerTemplateId == id && q.IsActive).ToList();
            if (activeUsages.Any())
            {
                var names = string.Join(", ", activeUsages.Take(3).Select(q =>
                    $"\"{q.Text.Substring(0, Math.Min(40, q.Text.Length))}{(q.Text.Length > 40 ? "..." : "")}\""));
                var more = activeUsages.Count > 3 ? $" ve {activeUsages.Count - 3} soru daha" : "";
                throw new BusinessRuleException(
                    $"Bu şablon {activeUsages.Count} aktif soruda kullanılmaktadır. Pasife almadan önce bu soruları pasife alınız.",
                    activeUsages.Count,
                    $"{names}{more}");
            }
        }

        template.Name = request.Name;
        template.IsActive = request.IsActive;
        template.UpdatedAt = DateTime.UtcNow;
        template.Options.Clear();
        template.Options = request.Options.Select((o, i) => new AnswerOption
        {
            Id = o.Id ?? 0,
            Text = o.Text,
            OrderIndex = o.OrderIndex,
            AnswerTemplateId = id
        }).ToList();

        await _uow.AnswerTemplates.UpdateAsync(template);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("Answer template updated: {TemplateId} - {TemplateName}", id, template.Name);

        var updated = await _uow.AnswerTemplates.GetWithOptionsAsync(id);
        return MapToDto(updated!);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var template = await _uow.AnswerTemplates.GetByIdAsync(id);
        if (template == null) return false;

        var questions = await _uow.Questions.GetAllWithTemplatesAsync();
        var usedInQuestions = questions.Where(q => q.AnswerTemplateId == id).ToList();
        if (usedInQuestions.Any())
        {
            var names = string.Join(", ", usedInQuestions.Take(3).Select(q =>
                $"\"{q.Text.Substring(0, Math.Min(40, q.Text.Length))}{(q.Text.Length > 40 ? "..." : "")}\""));
            var more = usedInQuestions.Count > 3 ? $" ve {usedInQuestions.Count - 3} soru daha" : "";
            throw new BusinessRuleException(
                $"Bu şablon {usedInQuestions.Count} soruda kullanılmaktadır ve silinemez.",
                usedInQuestions.Count,
                $"{names}{more}");
        }

        await _uow.AnswerTemplates.DeleteAsync(template);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("Answer template soft-deleted: {TemplateId}", id);
        return true;
    }

    private static AnswerTemplateDto MapToDto(AnswerTemplate t) =>
        new(t.Id, t.Name, t.IsActive,
            t.Options.OrderBy(o => o.OrderIndex).Select(o => new AnswerOptionDto(o.Id, o.Text, o.OrderIndex)).ToList());

    private static AnswerTemplateDto MapToDtoWithCount(AnswerTemplate t, int usedInQuestionsCount) =>
        new(t.Id, t.Name, t.IsActive,
            t.Options.OrderBy(o => o.OrderIndex).Select(o => new AnswerOptionDto(o.Id, o.Text, o.OrderIndex)).ToList(),
            usedInQuestionsCount);
}