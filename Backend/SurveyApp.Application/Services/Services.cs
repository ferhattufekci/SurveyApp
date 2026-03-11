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

        // Duplicate soru metni kontrolü
        var existing = await _uow.Questions.GetAllWithTemplatesAsync();
        if (existing.Any(q => q.Text.Trim().ToLower() == request.Text.Trim().ToLower()))
            throw new ArgumentException($"Bu soru metniyle zaten bir soru mevcut. Farklı bir metin giriniz.");

        var question = new Question { Text = request.Text, AnswerTemplateId = request.AnswerTemplateId, IsActive = request.IsActive };
        await _uow.Questions.AddAsync(question);
        await _uow.SaveChangesAsync();

        var created = await _uow.Questions.GetWithTemplateAsync(question.Id);
        return MapToDto(created!);
    }

    public async Task<QuestionDto?> UpdateAsync(int id, UpdateQuestionRequest request)
    {
        var q = await _uow.Questions.GetByIdAsync(id);
        if (q == null) return null;

        // Duplicate soru metni kontrolü (kendi ID'si hariç)
        var existing = await _uow.Questions.GetAllWithTemplatesAsync();
        if (existing.Any(x => x.Id != id && x.Text.Trim().ToLower() == request.Text.Trim().ToLower()))
            throw new ArgumentException($"Bu soru metniyle zaten bir soru mevcut. Farklı bir metin giriniz.");

        // Aktif anketlerde kullanılan soru pasife alınamaz
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
                    $"Bu soru {activeUsages.Count} aktif ankette kullanılmaktadır. Pasife almadan önce bu anketleri pasife alınız.|{activeUsages.Count}|{names}{more}"
                );
            }
        }

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

        // Ankette kullanılan soru silinemez
        var surveys = await _uow.Surveys.GetAllWithDetailsAsync();
        var usedInSurveys = surveys.Where(s => s.SurveyQuestions.Any(sq => sq.QuestionId == id)).ToList();
        if (usedInSurveys.Any())
        {
            var names = string.Join(", ", usedInSurveys.Take(3).Select(s =>
                $"\"{s.Title.Substring(0, Math.Min(40, s.Title.Length))}{(s.Title.Length > 40 ? "..." : "")}\""));
            var more = usedInSurveys.Count > 3 ? $" ve {usedInSurveys.Count - 3} anket daha" : "";
            throw new InvalidOperationException(
                $"Bu soru {usedInSurveys.Count} ankette kullanılmaktadır ve silinemez.|{usedInSurveys.Count}|{names}{more}"
            );
        }

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
        // Duplicate başlık kontrolü
        var allSurveys = await _uow.Surveys.GetAllWithDetailsAsync();
        if (allSurveys.Any(s => s.Title.Trim().ToLower() == request.Title.Trim().ToLower()))
            throw new ArgumentException($"'{request.Title}' başlıklı bir anket zaten mevcut. Farklı bir başlık giriniz.");

        // Pasif kullanıcı atanamaz
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

        // Yanıtlayan varsa düzenleme yapılamaz
        if (survey.SurveyResponses.Any())
            throw new InvalidOperationException(
                $"Bu anket {survey.SurveyResponses.Count} kullanıcı tarafından yanıtlanmıştır ve düzenlenemez.|{survey.SurveyResponses.Count}|Yanıt verilen anketlerin içeriği değiştirilemez."
            );

        // Duplicate başlık kontrolü (kendi ID'si hariç)
        var allSurveys = await _uow.Surveys.GetAllWithDetailsAsync();
        if (allSurveys.Any(s => s.Id != id && s.Title.Trim().ToLower() == request.Title.Trim().ToLower()))
            throw new ArgumentException($"'{request.Title}' başlıklı bir anket zaten mevcut. Farklı bir başlık giriniz.");

        // Pasif kullanıcı atanamaz
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

        var updated = await _uow.Surveys.GetWithDetailsAsync(id);
        return MapToDto(updated!);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var survey = await _uow.Surveys.GetWithDetailsAsync(id);
        if (survey == null) return false;

        // Süresi geçmiş anket silinemez
        if (survey.IsActive && survey.EndDate < DateTime.UtcNow)
            throw new InvalidOperationException("Süresi geçmiş anketler silinemez.");

        // Yanıt almış anket silinemez
        if (survey.SurveyResponses.Any())
            throw new InvalidOperationException($"Bu anket {survey.SurveyResponses.Count} kullanıcı tarafından yanıtlanmıştır ve silinemez.");

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
        // Pasif kullanıcı anket dolduramaz
        var user = await _uow.Users.GetByIdAsync(userId);
        if (user == null || !user.IsActive) return false;

        // Tekrar doldurma engeli
        var alreadyCompleted = await _uow.Surveys.HasUserCompletedSurveyAsync(request.SurveyId, userId);
        if (alreadyCompleted) return false;

        // Anket var mı, aktif mi?
        var survey = await _uow.Surveys.GetWithDetailsAsync(request.SurveyId);
        if (survey == null || !survey.IsActive) return false;

        // Tarih aralığı kontrolü
        var now = DateTime.UtcNow;
        if (now < survey.StartDate || now > survey.EndDate) return false;

        // Kullanıcıya atanmış mı?
        var isAssigned = survey.SurveyAssignments.Any(a => a.UserId == userId);
        if (!isAssigned) return false;

        // Tüm sorular cevaplanmış mı?
        var surveyQuestionIds = survey.SurveyQuestions.Select(sq => sq.QuestionId).ToHashSet();
        var answeredQuestionIds = request.Answers.Select(a => a.QuestionId).ToHashSet();
        if (!surveyQuestionIds.SetEquals(answeredQuestionIds)) return false;

        // Her cevap, ilgili sorunun şablonuna ait geçerli bir seçenek mi?
        foreach (var answer in request.Answers)
        {
            var surveyQuestion = survey.SurveyQuestions.FirstOrDefault(sq => sq.QuestionId == answer.QuestionId);
            if (surveyQuestion == null) return false;

            var validOptionIds = surveyQuestion.Question.AnswerTemplate.Options.Select(o => o.Id).ToHashSet();
            if (!validOptionIds.Contains(answer.AnswerOptionId)) return false;
        }

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

    public async Task<List<UserAnswerDto>> GetMyAnswersAsync(int userId, int surveyId)
    {
        var response = await _uow.SurveyResponses.GetByUserAndSurveyAsync(userId, surveyId);
        if (response == null) return new List<UserAnswerDto>();
        return response.Answers.Select(a => new UserAnswerDto(a.QuestionId, a.AnswerOptionId)).ToList();
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
            s.SurveyAssignments.Count, s.SurveyResponses.Count,
            s.SurveyQuestions.Select(sq => sq.QuestionId).ToList())).ToList();
    }
}

public class UserService : IUserService
{
    private readonly IUnitOfWork _uow;
    public UserService(IUnitOfWork uow) => _uow = uow;

    public async Task<List<UserDto>> GetAllAsync()
    {
        var users = await _uow.Users.GetAllAsync();
        return users.Select(u => new UserDto(u.Id, u.Email, u.FullName, u.Role, u.IsActive)).ToList();
    }

    public async Task<UserDto?> GetByIdAsync(int id)
    {
        var u = await _uow.Users.GetByIdAsync(id);
        return u == null ? null : new UserDto(u.Id, u.Email, u.FullName, u.Role, u.IsActive);
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request)
    {
        // Duplicate email kontrolü — DB exception yerine anlamlı hata mesajı
        var existing = await _uow.Users.GetByEmailAsync(request.Email);
        if (existing != null)
            throw new ArgumentException("Bu e-posta adresiyle zaten bir kullanıcı mevcut.");

        var user = new Domain.Entities.User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            Role = request.Role,
            IsActive = request.IsActive
        };
        await _uow.Users.AddAsync(user);
        await _uow.SaveChangesAsync();
        return new UserDto(user.Id, user.Email, user.FullName, user.Role, user.IsActive);
    }

    public async Task<UserDto?> UpdateAsync(int id, UpdateUserRequest request)
    {
        var u = await _uow.Users.GetByIdAsync(id);
        if (u == null) return null;

        // Aktif→Pasif geçişinde: aktif ankete atanmış mı kontrol et
        if (u.IsActive && !request.IsActive)
        {
            var surveys = await _uow.Surveys.GetAllWithDetailsAsync();
            var activeUsages = surveys
                .Where(s => s.IsActive && s.SurveyAssignments.Any(a => a.UserId == id))
                .ToList();
            if (activeUsages.Any())
            {
                var names = string.Join(", ", activeUsages.Take(3).Select(s =>
                    $"\"{s.Title.Substring(0, Math.Min(40, s.Title.Length))}{(s.Title.Length > 40 ? "..." : "")}\""));
                var more = activeUsages.Count > 3 ? $" ve {activeUsages.Count - 3} anket daha" : "";
                throw new InvalidOperationException(
                    $"Bu kullanıcı {activeUsages.Count} aktif ankete atanmıştır. Pasife almadan önce bu anketleri güncelleyiniz.|{activeUsages.Count}|{names}{more}"
                );
            }
        }

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

        // Son admin koruması
        if (u.Role == "Admin")
        {
            var adminCount = await _uow.Users.GetActiveAdminCountAsync();
            if (adminCount <= 1)
                throw new InvalidOperationException("Sistemde en az bir aktif admin bulunmalıdır. Son admin silinemez.");
        }

        // Ankette kullanılan kullanıcı silinemez
        var surveys = await _uow.Surveys.GetAllWithDetailsAsync();
        var usedInSurveys = surveys.Where(s => s.SurveyAssignments.Any(a => a.UserId == id)).ToList();
        if (usedInSurveys.Any())
        {
            var names = string.Join(", ", usedInSurveys.Take(3).Select(s =>
                $"\"{s.Title.Substring(0, Math.Min(40, s.Title.Length))}{(s.Title.Length > 40 ? "..." : "")}\""));
            var more = usedInSurveys.Count > 3 ? $" ve {usedInSurveys.Count - 3} anket daha" : "";
            throw new InvalidOperationException(
                $"Bu kullanıcı {usedInSurveys.Count} ankete atanmıştır ve silinemez.|{usedInSurveys.Count}|{names}{more}"
            );
        }

        await _uow.Users.DeleteAsync(u);
        await _uow.SaveChangesAsync();
        return true;
    }
}
