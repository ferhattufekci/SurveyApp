using SurveyApp.Application.DTOs;

namespace SurveyApp.Application.Interfaces;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request);
    string GenerateToken(int userId, string email, string role);
}

public interface IAnswerTemplateService
{
    Task<List<AnswerTemplateDto>> GetAllAsync();
    Task<AnswerTemplateDto?> GetByIdAsync(int id);
    Task<AnswerTemplateDto> CreateAsync(CreateAnswerTemplateRequest request);
    Task<AnswerTemplateDto?> UpdateAsync(int id, UpdateAnswerTemplateRequest request);
    Task<bool> DeleteAsync(int id);
}

public interface IQuestionService
{
    Task<List<QuestionListDto>> GetAllAsync();
    Task<QuestionDto?> GetByIdAsync(int id);
    Task<QuestionDto> CreateAsync(CreateQuestionRequest request);
    Task<QuestionDto?> UpdateAsync(int id, UpdateQuestionRequest request);
    Task<bool> DeleteAsync(int id);
}

public interface ISurveyService
{
    Task<List<SurveyListDto>> GetAllAsync();
    Task<SurveyDetailDto?> GetByIdAsync(int id);
    Task<SurveyDetailDto> CreateAsync(CreateSurveyRequest request);
    Task<SurveyDetailDto?> UpdateAsync(int id, UpdateSurveyRequest request);
    Task<bool> DeleteAsync(int id);
}

public interface IUserSurveyService
{
    Task<List<UserSurveyListDto>> GetAssignedSurveysAsync(int userId);
    Task<SurveyDetailDto?> GetSurveyForUserAsync(int surveyId, int userId);
    Task<bool> SubmitSurveyAsync(int userId, SubmitSurveyRequest request);
    Task<List<UserAnswerDto>> GetMyAnswersAsync(int userId, int surveyId);
}

public interface IReportService
{
    Task<SurveyReportDto?> GetSurveyReportAsync(int surveyId);
    Task<List<SurveyListDto>> GetAllSurveysWithStatsAsync();
}

public interface IUserService
{
    Task<List<UserDto>> GetAllAsync();
    Task<UserDto?> GetByIdAsync(int id);
    Task<UserDto> CreateAsync(CreateUserRequest request);
    Task<UserDto?> UpdateAsync(int id, UpdateUserRequest request);
    Task<bool> DeleteAsync(int id);
}
