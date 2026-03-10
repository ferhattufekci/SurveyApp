using SurveyApp.Application.DTOs;
using SurveyApp.Application.Interfaces;
using SurveyApp.Domain.Entities;
using SurveyApp.Domain.Interfaces;

namespace SurveyApp.Application.Services;

public class QuestionService : IQuestionService
{
    private readonly IUnitOfWork _uow;
    public QuestionService(IUnitOfWork uow) => _uow = uow;

    public async Task<List<QuestionListDto>> GetAllAsync()
    {
        var questions = await _uow.Questions.GetAllWithTemplatesAsync();
        return questions.Select(q => new QuestionListDto(q.Id, q.Text, q.IsActive, q.AnswerTemplateId, q.AnswerTemplate.Name)).ToList();
    }

    public async Task<QuestionDto?> GetByIdAsync(int id)
    {
        var q = await _uow.Questions.GetWithTemplateAsync(id);
        return q == null ? null : MapToDto(q);
    }

    public async Task<QuestionDto> CreateAsync(CreateQuestionRequest request)
    {
        var template = await _uow.AnswerTemplates.GetWithOptionsAsync(request.AnswerTemplateId)
            ?? throw new ArgumentException("Answer template not found.");

        var question = new Question { Text = request.Text, AnswerTemplateId = request.AnswerTemplateId };
        await _uow.Questions.AddAsync(question);
        await _uow.SaveChangesAsync();

        var created = await _uow.Questions.GetWithTemplateAsync(question.Id);
        return MapToDto(created!);
    }

    public async Task<QuestionDto?> UpdateAsync(int id, UpdateQuestionRequest request)
    {
        var q = await _uow.Questions.GetByIdAsync(id);
        if (q == null) return null;

        q.Text = request.Text;
        q.AnswerTemplateId = request.AnswerTemplateId;
        q.IsActive = request.IsActive;
        q.UpdatedAt = DateTime.UtcNow;

        await _uow.Questions.UpdateAsync(q);
        await _uow.SaveChangesAsync();

        var updated = await _uow.Questions.GetWithTemplateAsync(id);
        return MapToDto(updated!);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var q = await _uow.Questions.GetByIdAsync(id);
        if (q == null) return false;
        await _uow.Questions.DeleteAsync(q);
        await _uow.SaveChangesAsync();
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

public class SurveyService : ISurveyService
{
    private readonly IUnitOfWork _uow;
    public SurveyService(IUnitOfWork uow) => _uow = uow;

    public async Task<List<SurveyListDto>> GetAllAsync()
    {
        var surveys = await _uow.Surveys.GetAllWithDetailsAsync();
        return surveys.Select(s => new SurveyListDto(s.Id, s.Title, s.Description, s.StartDate, s.EndDate, s.IsActive,
            s.SurveyAssignments.Count, s.SurveyResponses.Count)).ToList();
    }

    public async Task<SurveyDetailDto?> GetByIdAsync(int id)
    {
        var s = await _uow.Surveys.GetWithDetailsAsync(id);
        return s == null ? null : MapToDto(s);
    }

    public async Task<SurveyDetailDto> CreateAsync(CreateSurveyRequest request)
    {
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

        var created = await _uow.Surveys.GetWithDetailsAsync(survey.Id);
        return MapToDto(created!);
    }

    public async Task<SurveyDetailDto?> UpdateAsync(int id, UpdateSurveyRequest request)
    {
        var survey = await _uow.Surveys.GetWithDetailsAsync(id);
        if (survey == null) return null;

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

        var updated = await _uow.Surveys.GetWithDetailsAsync(id);
        return MapToDto(updated!);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var survey = await _uow.Surveys.GetByIdAsync(id);
        if (survey == null) return false;
        await _uow.Surveys.DeleteAsync(survey);
        await _uow.SaveChangesAsync();
        return true;
    }

    private static SurveyDetailDto MapToDto(Survey s)
    {
        var questions = s.SurveyQuestions.OrderBy(sq => sq.OrderIndex).Select(sq =>
        {
            var q = sq.Question;
            var t = q.AnswerTemplate;
            var tDto = new AnswerTemplateDto(t.Id, t.Name, t.IsActive,
                t.Options.OrderBy(o => o.OrderIndex).Select(o => new AnswerOptionDto(o.Id, o.Text, o.OrderIndex)).ToList());
            return new SurveyQuestionDto(sq.Id, q.Id, q.Text, sq.OrderIndex, tDto);
        }).ToList();

        return new SurveyDetailDto(s.Id, s.Title, s.Description, s.StartDate, s.EndDate, s.IsActive,
            questions, s.SurveyAssignments.Select(a => a.UserId).ToList());
    }
}

public class UserSurveyService : IUserSurveyService
{
    private readonly IUnitOfWork _uow;
    public UserSurveyService(IUnitOfWork uow) => _uow = uow;

    public async Task<List<UserSurveyListDto>> GetAssignedSurveysAsync(int userId)
    {
        var surveys = await _uow.Surveys.GetAssignedSurveysForUserAsync(userId);
        var now = DateTime.UtcNow;
        var result = new List<UserSurveyListDto>();

        foreach (var s in surveys)
        {
            var completed = await _uow.Surveys.HasUserCompletedSurveyAsync(s.Id, userId);
            result.Add(new UserSurveyListDto(s.Id, s.Title, s.Description, s.StartDate, s.EndDate, completed));
        }
        return result;
    }

    public async Task<SurveyDetailDto?> GetSurveyForUserAsync(int surveyId, int userId)
    {
        var survey = await _uow.Surveys.GetWithDetailsAsync(surveyId);
        if (survey == null) return null;

        var isAssigned = survey.SurveyAssignments.Any(a => a.UserId == userId);
        if (!isAssigned) return null;

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
        var alreadyCompleted = await _uow.Surveys.HasUserCompletedSurveyAsync(request.SurveyId, userId);
        if (alreadyCompleted) return false;

        var response = new SurveyResponse
        {
            SurveyId = request.SurveyId,
            UserId = userId,
            Answers = request.Answers.Select(a => new SurveyAnswer
            {
                QuestionId = a.QuestionId,
                AnswerOptionId = a.AnswerOptionId
            }).ToList()
        };

        await _uow.SurveyResponses.AddAsync(response);
        await _uow.SaveChangesAsync();
        return true;
    }
}

public class ReportService : IReportService
{
    private readonly IUnitOfWork _uow;
    public ReportService(IUnitOfWork uow) => _uow = uow;

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

        return new SurveyReportDto(survey.Id, survey.Title, assignedUserIds.Count,
            respondedUserIds.Count, pendingUserIds.Count, completedResponses, pendingUsers);
    }

    public async Task<List<SurveyListDto>> GetAllSurveysWithStatsAsync()
    {
        var surveys = await _uow.Surveys.GetAllWithDetailsAsync();
        return surveys.Select(s => new SurveyListDto(s.Id, s.Title, s.Description, s.StartDate, s.EndDate, s.IsActive,
            s.SurveyAssignments.Count, s.SurveyResponses.Count)).ToList();
    }
}

public class UserService : IUserService
{
    private readonly IUnitOfWork _uow;
    public UserService(IUnitOfWork uow) => _uow = uow;

    public async Task<List<UserDto>> GetAllAsync()
    {
        var users = await _uow.Users.GetAllActiveUsersAsync();
        return users.Select(u => new UserDto(u.Id, u.Email, u.FullName, u.Role, u.IsActive)).ToList();
    }

    public async Task<UserDto?> GetByIdAsync(int id)
    {
        var u = await _uow.Users.GetByIdAsync(id);
        return u == null ? null : new UserDto(u.Id, u.Email, u.FullName, u.Role, u.IsActive);
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request)
    {
        var user = new Domain.Entities.User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            Role = request.Role
        };
        await _uow.Users.AddAsync(user);
        await _uow.SaveChangesAsync();
        return new UserDto(user.Id, user.Email, user.FullName, user.Role, user.IsActive);
    }

    public async Task<UserDto?> UpdateAsync(int id, UpdateUserRequest request)
    {
        var u = await _uow.Users.GetByIdAsync(id);
        if (u == null) return null;
        u.FullName = request.FullName;
        u.IsActive = request.IsActive;
        await _uow.Users.UpdateAsync(u);
        await _uow.SaveChangesAsync();
        return new UserDto(u.Id, u.Email, u.FullName, u.Role, u.IsActive);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var u = await _uow.Users.GetByIdAsync(id);
        if (u == null) return false;
        await _uow.Users.DeleteAsync(u);
        await _uow.SaveChangesAsync();
        return true;
    }
}
