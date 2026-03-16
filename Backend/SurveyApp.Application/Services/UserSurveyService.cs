using Microsoft.Extensions.Logging;
using SurveyApp.Application.DTOs;
using SurveyApp.Application.Interfaces;
using SurveyApp.Domain.Interfaces;

namespace SurveyApp.Application.Services;

public class UserSurveyService : IUserSurveyService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<UserSurveyService> _logger;

    public UserSurveyService(IUnitOfWork uow, ILogger<UserSurveyService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

    public async Task<List<UserSurveyListDto>> GetAssignedSurveysAsync(int userId)
    {
        var surveys = await _uow.Surveys.GetAssignedSurveysForUserAsync(userId);
        var result = new List<UserSurveyListDto>();
        foreach (var s in surveys)
        {
            var completed = await _uow.Surveys.HasUserCompletedSurveyAsync(s.Id, userId);
            var questions = s.SurveyQuestions.OrderBy(sq => sq.OrderIndex).Select(sq => new SurveyQuestionDto(
                sq.Id, sq.QuestionId, sq.Question.Text, sq.OrderIndex,
                new AnswerTemplateDto(sq.Question.AnswerTemplate.Id, sq.Question.AnswerTemplate.Name,
                    sq.Question.AnswerTemplate.IsActive,
                    sq.Question.AnswerTemplate.Options.OrderBy(o => o.OrderIndex)
                        .Select(o => new AnswerOptionDto(o.Id, o.Text, o.OrderIndex)).ToList())
            )).ToList();
            result.Add(new UserSurveyListDto(s.Id, s.Title, s.Description, s.StartDate, s.EndDate, completed, questions));
        }
        return result;
    }

    public async Task<SurveyDetailDto?> GetSurveyForUserAsync(int surveyId, int userId)
    {
        var survey = await _uow.Surveys.GetWithDetailsAsync(surveyId);
        if (survey == null) return null;
        if (!survey.SurveyAssignments.Any(a => a.UserId == userId)) return null;
        var now = DateTime.UtcNow;
        if (now < survey.StartDate || now > survey.EndDate || !survey.IsActive) return null;

        var questions = survey.SurveyQuestions.OrderBy(sq => sq.OrderIndex).Select(sq =>
        {
            var q = sq.Question;
            var t = q.AnswerTemplate;
            var tDto = new AnswerTemplateDto(t.Id, t.Name, t.IsActive,
                t.Options.OrderBy(o => o.OrderIndex).Select(o => new AnswerOptionDto(o.Id, o.Text, o.OrderIndex)).ToList());
            return new SurveyQuestionDto(sq.Id, q.Id, q.Text, sq.OrderIndex, tDto);
        }).ToList();

        return new SurveyDetailDto(survey.Id, survey.Title, survey.Description, survey.StartDate, survey.EndDate,
            survey.IsActive, questions, survey.SurveyAssignments.Select(a => a.UserId).ToList());
    }

    public async Task<bool> SubmitSurveyAsync(int userId, SubmitSurveyRequest request)
    {
        var user = await _uow.Users.GetByIdAsync(userId);
        if (user == null || !user.IsActive) return false;

        var alreadyCompleted = await _uow.Surveys.HasUserCompletedSurveyAsync(request.SurveyId, userId);
        if (alreadyCompleted) return false;

        var survey = await _uow.Surveys.GetWithDetailsAsync(request.SurveyId);
        if (survey == null || !survey.IsActive) return false;

        var now = DateTime.UtcNow;
        if (now < survey.StartDate || now > survey.EndDate) return false;
        if (!survey.SurveyAssignments.Any(a => a.UserId == userId)) return false;

        var surveyQuestionIds = survey.SurveyQuestions.Select(sq => sq.QuestionId).ToHashSet();
        var answeredQuestionIds = request.Answers.Select(a => a.QuestionId).ToHashSet();
        if (!surveyQuestionIds.SetEquals(answeredQuestionIds)) return false;

        foreach (var answer in request.Answers)
        {
            var surveyQuestion = survey.SurveyQuestions.FirstOrDefault(sq => sq.QuestionId == answer.QuestionId);
            if (surveyQuestion == null) return false;
            var validOptionIds = surveyQuestion.Question.AnswerTemplate.Options.Select(o => o.Id).ToHashSet();
            if (!validOptionIds.Contains(answer.AnswerOptionId)) return false;
        }

        var response = new Domain.Entities.SurveyResponse
        {
            SurveyId = request.SurveyId,
            UserId = userId,
            Answers = request.Answers.Select(a => new Domain.Entities.SurveyAnswer
            {
                QuestionId = a.QuestionId,
                AnswerOptionId = a.AnswerOptionId
            }).ToList()
        };

        await _uow.SurveyResponses.AddAsync(response);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("Survey {SurveyId} submitted by user {UserId}", request.SurveyId, userId);
        return true;
    }

    public async Task<List<UserAnswerDto>> GetMyAnswersAsync(int userId, int surveyId)
    {
        var response = await _uow.SurveyResponses.GetByUserAndSurveyAsync(userId, surveyId);
        if (response == null) return new List<UserAnswerDto>();
        return response.Answers.Select(a => new UserAnswerDto(a.QuestionId, a.AnswerOptionId)).ToList();
    }
}