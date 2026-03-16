using Microsoft.Extensions.Logging;
using SurveyApp.Application.DTOs;
using SurveyApp.Application.Interfaces;
using SurveyApp.Domain.Interfaces;

namespace SurveyApp.Application.Services;

public class ReportService : IReportService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<ReportService> _logger;

    public ReportService(IUnitOfWork uow, ILogger<ReportService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

    public async Task<SurveyReportDto?> GetSurveyReportAsync(int surveyId)
    {
        var survey = await _uow.Surveys.GetWithDetailsAsync(surveyId);
        if (survey == null) return null;

        var responses = await _uow.SurveyResponses.GetBySurveyIdAsync(surveyId);
        var assignedUserIds = survey.SurveyAssignments.Select(a => a.UserId).ToHashSet();
        var respondedUserIds = responses.Select(r => r.UserId).ToHashSet();
        var pendingUserIds = assignedUserIds.Except(respondedUserIds).ToList();

        var allUsers = await _uow.Users.GetAllActiveUsersAsync();
        var pendingUsers = allUsers.Where(u => pendingUserIds.Contains(u.Id))
            .Select(u => new UserDto(u.Id, u.Email, u.FullName, u.Role, u.IsActive)).ToList();

        var completedResponses = responses.Select(r =>
        {
            var answers = r.Answers.Select(a => new AnswerDetailDto(a.QuestionId, a.Question.Text, a.AnswerOption.Text)).ToList();
            return new UserResponseDto(r.UserId, r.User.FullName, r.User.Email, r.SubmittedAt, answers);
        }).ToList();

        _logger.LogInformation("Report generated for survey {SurveyId}: {Completed}/{Total} completed",
            surveyId, respondedUserIds.Count, assignedUserIds.Count);

        return new SurveyReportDto(survey.Id, survey.Title, assignedUserIds.Count,
            respondedUserIds.Count, pendingUserIds.Count, completedResponses, pendingUsers);
    }

    public async Task<List<SurveyListDto>> GetAllSurveysWithStatsAsync()
    {
        var surveys = await _uow.Surveys.GetAllWithDetailsAsync();
        return surveys.Select(s => new SurveyListDto(s.Id, s.Title, s.Description, s.StartDate, s.EndDate, s.IsActive,
            s.SurveyAssignments.Count, s.SurveyResponses.Count,
            s.SurveyQuestions.Select(sq => sq.QuestionId).ToList())).ToList();
    }
}