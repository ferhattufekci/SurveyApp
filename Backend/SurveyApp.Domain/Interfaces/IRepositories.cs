using SurveyApp.Domain.Entities;

namespace SurveyApp.Domain.Interfaces;

public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<T> AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
}

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
    Task<IEnumerable<User>> GetAllActiveUsersAsync();
    Task<int> GetActiveAdminCountAsync();
}

public interface IAnswerTemplateRepository : IRepository<AnswerTemplate>
{
    Task<AnswerTemplate?> GetWithOptionsAsync(int id);
    Task<IEnumerable<AnswerTemplate>> GetAllWithOptionsAsync();
}

public interface IQuestionRepository : IRepository<Question>
{
    Task<Question?> GetWithTemplateAsync(int id);
    Task<IEnumerable<Question>> GetAllWithTemplatesAsync();
}

public interface ISurveyRepository : IRepository<Survey>
{
    Task<Survey?> GetWithDetailsAsync(int id);
    Task<IEnumerable<Survey>> GetAllWithDetailsAsync();
    Task<IEnumerable<Survey>> GetAssignedSurveysForUserAsync(int userId);
    Task<bool> HasUserCompletedSurveyAsync(int surveyId, int userId);
	Task<HashSet<int>> GetCompletedSurveyIdsForUserAsync(int userId);
}

public interface ISurveyResponseRepository : IRepository<SurveyResponse>
{
    Task<SurveyResponse?> GetWithAnswersAsync(int id);
    Task<IEnumerable<SurveyResponse>> GetBySurveyIdAsync(int surveyId);
    Task<SurveyResponse?> GetByUserAndSurveyAsync(int userId, int surveyId);
}

public interface IUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    IAnswerTemplateRepository AnswerTemplates { get; }
    IQuestionRepository Questions { get; }
    ISurveyRepository Surveys { get; }
    ISurveyResponseRepository SurveyResponses { get; }
    Task<int> SaveChangesAsync();
}
