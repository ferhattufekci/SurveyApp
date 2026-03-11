using SurveyApp.Application.DTOs;
using SurveyApp.Application.Interfaces;
using SurveyApp.Domain.Entities;
using SurveyApp.Domain.Interfaces;

namespace SurveyApp.Application.Services;

public class AnswerTemplateService : IAnswerTemplateService
{
    private readonly IUnitOfWork _uow;

    public AnswerTemplateService(IUnitOfWork uow) => _uow = uow;

    public async Task<List<AnswerTemplateDto>> GetAllAsync()
    {
        var templates = await _uow.AnswerTemplates.GetAllWithOptionsAsync();
        return templates.Select(MapToDto).ToList();
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

        var updated = await _uow.AnswerTemplates.GetWithOptionsAsync(id);
        return MapToDto(updated!);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var template = await _uow.AnswerTemplates.GetByIdAsync(id);
        if (template == null) return false;

        await _uow.AnswerTemplates.DeleteAsync(template);
        await _uow.SaveChangesAsync();
        return true;
    }

    private static AnswerTemplateDto MapToDto(AnswerTemplate t) =>
        new(t.Id, t.Name, t.IsActive,
            t.Options.OrderBy(o => o.OrderIndex).Select(o => new AnswerOptionDto(o.Id, o.Text, o.OrderIndex)).ToList());
}
