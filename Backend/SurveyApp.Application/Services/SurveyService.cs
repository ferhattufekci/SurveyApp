using Microsoft.Extensions.Logging;
using SurveyApp.Application.DTOs;
using SurveyApp.Application.Extensions;
using SurveyApp.Application.Interfaces;
using SurveyApp.Domain.Entities;
using SurveyApp.Domain.Exceptions;
using SurveyApp.Domain.Interfaces;

namespace SurveyApp.Application.Services;

public class SurveyService : ISurveyService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<SurveyService> _logger;

    public SurveyService(IUnitOfWork uow, ILogger<SurveyService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

    public async Task<List<SurveyListDto>> GetAllAsync()
    {
        var surveys = await _uow.Surveys.GetAllWithDetailsAsync();
        return surveys.Select(s => new SurveyListDto(s.Id, s.Title, s.Description, s.StartDate, s.EndDate, s.IsActive,
            s.SurveyAssignments.Count, s.SurveyResponses.Count,
            s.SurveyQuestions.Select(sq => sq.QuestionId).ToList())).ToList();
    }

    public async Task<SurveyDetailDto?> GetByIdAsync(int id)
    {
        var s = await _uow.Surveys.GetWithDetailsAsync(id);
        return s == null ? null : MapToDto(s);
    }

    public async Task<SurveyDetailDto> CreateAsync(CreateSurveyRequest request)
    {
        // ÖNCE: sıralı — allSurveys beklendi, sonra allUsers başladı
        // var allSurveys = await _uow.Surveys.GetAllWithDetailsAsync();
        // var allUsers   = await _uow.Users.GetAllAsync();

        // SONRA: paralel — ikisi aynı anda başlıyor, toplam süre = max(T1, T2)
        var (allSurveys, allUsers) = await (
            _uow.Surveys.GetAllWithDetailsAsync(),
            _uow.Users.GetAllAsync()
        ).WhenAll();

        if (allSurveys.Any(s => s.Title.Trim().ToLower() == request.Title.Trim().ToLower()))
            throw new ArgumentException($"'{request.Title}' başlıklı bir anket zaten mevcut. Farklı bir başlık giriniz.");

        if (request.UserIds.Any())
        {
            var passiveAssigned = allUsers.Where(u => request.UserIds.Contains(u.Id) && !u.IsActive).ToList();
            if (passiveAssigned.Any())
            {
                var names = string.Join(", ", passiveAssigned.Select(u => $"\"{u.FullName}\""));
                throw new ArgumentException($"Pasif kullanıcılar ankete atanamaz: {names}");
            }
        }

        var survey = new Survey
        {
            Title = request.Title,
            Description = request.Description,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsActive = request.IsActive,
            SurveyQuestions = request.QuestionIds.Select((qId, i) => new SurveyQuestion
            {
                QuestionId = qId,
                OrderIndex = i
            }).ToList(),
            SurveyAssignments = request.UserIds.Select(uId => new SurveyAssignment
            {
                UserId = uId
            }).ToList()
        };

        await _uow.Surveys.AddAsync(survey);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("Survey created: {SurveyId} - {Title}", survey.Id, survey.Title);

        var created = await _uow.Surveys.GetWithDetailsAsync(survey.Id);
        return MapToDto(created!);
    }

    public async Task<SurveyDetailDto?> UpdateAsync(int id, UpdateSurveyRequest request)
    {
        // ÖNCE: sıralı — önce survey çekildi, sonra allSurveys başladı
        // var survey     = await _uow.Surveys.GetWithDetailsAsync(id);
        // var allSurveys = await _uow.Surveys.GetAllWithDetailsAsync();

        // SONRA: paralel — ikisi aynı anda başlıyor
        var (survey, allSurveys) = await (
            _uow.Surveys.GetWithDetailsAsync(id),
            _uow.Surveys.GetAllWithDetailsAsync()
        ).WhenAll();

        if (survey == null) return null;

        if (survey.SurveyResponses.Any())
            throw new BusinessRuleException(
                $"Bu anket {survey.SurveyResponses.Count} kullanıcı tarafından yanıtlanmıştır ve düzenlenemez.",
                survey.SurveyResponses.Count,
                "Yanıt verilen anketlerin içeriği değiştirilemez.");

        if (allSurveys.Any(s => s.Id != id && s.Title.Trim().ToLower() == request.Title.Trim().ToLower()))
            throw new ArgumentException($"'{request.Title}' başlıklı bir anket zaten mevcut. Farklı bir başlık giriniz.");

        if (request.UserIds.Any())
        {
            var allUsers = await _uow.Users.GetAllAsync();
            var passiveAssigned = allUsers.Where(u => request.UserIds.Contains(u.Id) && !u.IsActive).ToList();
            if (passiveAssigned.Any())
            {
                var names = string.Join(", ", passiveAssigned.Select(u => $"\"{u.FullName}\""));
                throw new ArgumentException($"Pasif kullanıcılar ankete atanamaz: {names}");
            }
        }

        survey.Title = request.Title;
        survey.Description = request.Description;
        survey.StartDate = request.StartDate;
        survey.EndDate = request.EndDate;
        survey.IsActive = request.IsActive;
        survey.UpdatedAt = DateTime.UtcNow;
        survey.SurveyQuestions.Clear();
        survey.SurveyQuestions = request.QuestionIds.Select((qId, i) => new SurveyQuestion
        {
            SurveyId = id,
            QuestionId = qId,
            OrderIndex = i
        }).ToList();
        survey.SurveyAssignments.Clear();
        survey.SurveyAssignments = request.UserIds.Select(uId => new SurveyAssignment
        {
            SurveyId = id,
            UserId = uId
        }).ToList();

        await _uow.Surveys.UpdateAsync(survey);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("Survey updated: {SurveyId}", id);

        var updated = await _uow.Surveys.GetWithDetailsAsync(id);
        return MapToDto(updated!);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var survey = await _uow.Surveys.GetWithDetailsAsync(id);
        if (survey == null) return false;

        if (survey.IsActive && survey.EndDate < DateTime.UtcNow)
            throw new InvalidOperationException("Süresi geçmiş anketler silinemez.");

        if (survey.SurveyResponses.Any())
            throw new BusinessRuleException(
                $"Bu anket {survey.SurveyResponses.Count} kullanıcı tarafından yanıtlanmıştır ve silinemez.",
                survey.SurveyResponses.Count,
                "Yanıt alınan anketler silinemez.");

        await _uow.Surveys.DeleteAsync(survey);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("Survey soft-deleted: {SurveyId}", id);
        return true;
    }

    private static SurveyDetailDto MapToDto(Survey s)
    {
        var questions = s.SurveyQuestions.OrderBy(sq => sq.OrderIndex).Select(sq =>
        {
            var q = sq.Question;
            var t = q.AnswerTemplate;
            var tDto = new AnswerTemplateDto(t.Id, t.Name, t.IsActive,
                t.Options.OrderBy(o => o.OrderIndex)
                    .Select(o => new AnswerOptionDto(o.Id, o.Text, o.OrderIndex)).ToList());
            return new SurveyQuestionDto(sq.Id, q.Id, q.Text, sq.OrderIndex, tDto);
        }).ToList();

        return new SurveyDetailDto(s.Id, s.Title, s.Description, s.StartDate, s.EndDate, s.IsActive,
            questions, s.SurveyAssignments.Select(a => a.UserId).ToList());
    }
}