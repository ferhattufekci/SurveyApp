using Microsoft.EntityFrameworkCore;
using SurveyApp.Domain.Entities;
using SurveyApp.Domain.Interfaces;
using SurveyApp.Infrastructure.Data;

namespace SurveyApp.Infrastructure.Repositories;

public class Repository<T> : IRepository<T> where T : class
{
    protected readonly AppDbContext _db;
    public Repository(AppDbContext db) => _db = db;

    /// <summary>
    /// Uses FirstOrDefaultAsync (not FindAsync) so global query filters
    /// — including the soft-delete filter — are always respected.
    /// </summary>
    public async Task<T?> GetByIdAsync(int id) =>
        await _db.Set<T>()
                 .Where(e => EF.Property<int>(e, "Id") == id)
                 .FirstOrDefaultAsync();

    public async Task<IEnumerable<T>> GetAllAsync() =>
        await _db.Set<T>().ToListAsync();

    public async Task<T> AddAsync(T entity)
    {
        await _db.Set<T>().AddAsync(entity);
        return entity;
    }

    public Task UpdateAsync(T entity)
    {
        _db.Set<T>().Update(entity);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(T entity)
    {
        // AppDbContext.SaveChangesAsync intercepts this EntityState.Deleted
        // and converts it to a soft delete for ISoftDeletable entities.
        // Non-soft-deletable entities (e.g. SurveyResponse) are hard-deleted.
        _db.Set<T>().Remove(entity);
        return Task.CompletedTask;
    }
}


public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AppDbContext db) : base(db) { }

    public async Task<User?> GetByEmailAsync(string email) =>
        await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

    public async Task<IEnumerable<User>> GetAllActiveUsersAsync() =>
        await _db.Users.Where(u => u.IsActive).ToListAsync();

    public async Task<int> GetActiveAdminCountAsync() =>
        await _db.Users.CountAsync(u => u.Role == "Admin" && u.IsActive);
}

public class AnswerTemplateRepository : Repository<AnswerTemplate>, IAnswerTemplateRepository
{
    public AnswerTemplateRepository(AppDbContext db) : base(db) { }

    public async Task<AnswerTemplate?> GetWithOptionsAsync(int id) =>
        await _db.AnswerTemplates.Include(t => t.Options)
                                 .FirstOrDefaultAsync(t => t.Id == id);

    public async Task<IEnumerable<AnswerTemplate>> GetAllWithOptionsAsync() =>
        await _db.AnswerTemplates.Include(t => t.Options).ToListAsync();
}

public class QuestionRepository : Repository<Question>, IQuestionRepository
{
    public QuestionRepository(AppDbContext db) : base(db) { }

    public async Task<Question?> GetWithTemplateAsync(int id) =>
        await _db.Questions.Include(q => q.AnswerTemplate).ThenInclude(t => t.Options)
                           .FirstOrDefaultAsync(q => q.Id == id);

    public async Task<IEnumerable<Question>> GetAllWithTemplatesAsync() =>
        await _db.Questions.Include(q => q.AnswerTemplate).ThenInclude(t => t.Options)
                           .ToListAsync();
}

public class SurveyRepository : Repository<Survey>, ISurveyRepository
{
    public SurveyRepository(AppDbContext db) : base(db) { }

    public async Task<Survey?> GetWithDetailsAsync(int id) =>
        await _db.Surveys
            .Include(s => s.SurveyQuestions).ThenInclude(sq => sq.Question)
                .ThenInclude(q => q.AnswerTemplate).ThenInclude(t => t.Options)
            .Include(s => s.SurveyAssignments)
            .Include(s => s.SurveyResponses)
            .FirstOrDefaultAsync(s => s.Id == id);

    public async Task<IEnumerable<Survey>> GetAllWithDetailsAsync() =>
        await _db.Surveys
            .Include(s => s.SurveyAssignments)
            .Include(s => s.SurveyResponses)
            .Include(s => s.SurveyQuestions)
            .ToListAsync();

    public async Task<IEnumerable<Survey>> GetAssignedSurveysForUserAsync(int userId) =>
        await _db.Surveys
            .Include(s => s.SurveyAssignments)
            .Include(s => s.SurveyQuestions).ThenInclude(sq => sq.Question)
                .ThenInclude(q => q.AnswerTemplate).ThenInclude(t => t.Options)
            .Where(s => s.IsActive && s.SurveyAssignments.Any(a => a.UserId == userId))
            .ToListAsync();

    public async Task<bool> HasUserCompletedSurveyAsync(int surveyId, int userId) =>
        await _db.SurveyResponses.AnyAsync(r => r.SurveyId == surveyId && r.UserId == userId);
}

public class SurveyResponseRepository : Repository<SurveyResponse>, ISurveyResponseRepository
{
    public SurveyResponseRepository(AppDbContext db) : base(db) { }

    public async Task<SurveyResponse?> GetWithAnswersAsync(int id) =>
        await _db.SurveyResponses
            .Include(r => r.Answers).ThenInclude(a => a.Question)
            .Include(r => r.Answers).ThenInclude(a => a.AnswerOption)
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.Id == id);

    public async Task<IEnumerable<SurveyResponse>> GetBySurveyIdAsync(int surveyId) =>
        await _db.SurveyResponses
            .Include(r => r.Answers).ThenInclude(a => a.Question)
            .Include(r => r.Answers).ThenInclude(a => a.AnswerOption)
            .Include(r => r.User)
            .Where(r => r.SurveyId == surveyId)
            .ToListAsync();

    public async Task<SurveyResponse?> GetByUserAndSurveyAsync(int userId, int surveyId) =>
        await _db.SurveyResponses
            .Include(r => r.Answers).ThenInclude(a => a.AnswerOption)
            .FirstOrDefaultAsync(r => r.UserId == userId && r.SurveyId == surveyId);
}

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _db;

    public IUserRepository Users { get; }
    public IAnswerTemplateRepository AnswerTemplates { get; }
    public IQuestionRepository Questions { get; }
    public ISurveyRepository Surveys { get; }
    public ISurveyResponseRepository SurveyResponses { get; }

    public UnitOfWork(AppDbContext db)
    {
        _db = db;
        Users          = new UserRepository(db);
        AnswerTemplates = new AnswerTemplateRepository(db);
        Questions      = new QuestionRepository(db);
        Surveys        = new SurveyRepository(db);
        SurveyResponses = new SurveyResponseRepository(db);
    }

    public async Task<int> SaveChangesAsync() => await _db.SaveChangesAsync();
    public void Dispose() => _db.Dispose();
}