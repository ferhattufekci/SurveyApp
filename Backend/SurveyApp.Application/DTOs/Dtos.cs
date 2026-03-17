using System.ComponentModel.DataAnnotations;

namespace SurveyApp.Application.DTOs;

// ── Auth DTOs ─────────────────────────────────────────────────────────────────
public record LoginRequest(
    [Required(ErrorMessage = "E-posta zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
    [StringLength(256, ErrorMessage = "E-posta en fazla 256 karakter olabilir.")]
    string Email,

    [Required(ErrorMessage = "Şifre zorunludur.")]
    [StringLength(128, MinimumLength = 6, ErrorMessage = "Şifre en az 6, en fazla 128 karakter olmalıdır.")]
    string Password);

public record LoginResponse(string Token, string Email, string FullName, string Role, bool IsActive = true);

// ── User DTOs ─────────────────────────────────────────────────────────────────
public record UserDto(int Id, string Email, string FullName, string Role, bool IsActive);

public record CreateUserRequest(
    [Required(ErrorMessage = "E-posta zorunludur.")]
    [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
    [StringLength(256, ErrorMessage = "E-posta en fazla 256 karakter olabilir.")]
    string Email,

    [Required(ErrorMessage = "Şifre zorunludur.")]
    [StringLength(128, MinimumLength = 6, ErrorMessage = "Şifre en az 6, en fazla 128 karakter olmalıdır.")]
    string Password,

    [Required(ErrorMessage = "Ad Soyad zorunludur.")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Ad Soyad en az 2, en fazla 200 karakter olmalıdır.")]
    string FullName,

    [Required(ErrorMessage = "Rol zorunludur.")]
    [RegularExpression("^(Admin|User)$", ErrorMessage = "Rol 'Admin' veya 'User' olmalıdır.")]
    string Role,

    bool IsActive = true);

public record UpdateUserRequest(
    [Required(ErrorMessage = "Ad Soyad zorunludur.")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Ad Soyad en az 2, en fazla 200 karakter olmalıdır.")]
    string FullName,

    bool IsActive);

// ── AnswerTemplate DTOs ───────────────────────────────────────────────────────
public record AnswerOptionDto(int Id, string Text, int OrderIndex);

public record AnswerTemplateDto(int Id, string Name, bool IsActive, List<AnswerOptionDto> Options, int UsedInQuestionsCount = 0);

public record CreateAnswerTemplateRequest(
    [Required(ErrorMessage = "Şablon adı zorunludur.")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Şablon adı en az 2, en fazla 200 karakter olmalıdır.")]
    string Name,

    [Required(ErrorMessage = "Seçenekler zorunludur.")]
    [MinLength(2, ErrorMessage = "En az 2 seçenek girilmelidir.")]
    [MaxLength(4, ErrorMessage = "En fazla 4 seçenek girilebilir.")]
    List<string> Options,

    bool IsActive = true);

public record UpdateAnswerTemplateRequest(
    [Required(ErrorMessage = "Şablon adı zorunludur.")]
    [StringLength(200, MinimumLength = 2, ErrorMessage = "Şablon adı en az 2, en fazla 200 karakter olmalıdır.")]
    string Name,

    bool IsActive,

    [Required(ErrorMessage = "Seçenekler zorunludur.")]
    List<AnswerOptionUpdateDto> Options);

public record AnswerOptionUpdateDto(
    int? Id,

    [Required(ErrorMessage = "Seçenek metni zorunludur.")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Seçenek metni en az 1, en fazla 200 karakter olmalıdır.")]
    string Text,

    int OrderIndex);

// ── Question DTOs ─────────────────────────────────────────────────────────────
public record QuestionDto(int Id, string Text, bool IsActive, AnswerTemplateDto AnswerTemplate);

public record QuestionListDto(int Id, string Text, bool IsActive, int AnswerTemplateId, string AnswerTemplateName, int UsedInSurveysCount = 0);

public record CreateQuestionRequest(
    [Required(ErrorMessage = "Soru metni zorunludur.")]
    [StringLength(1000, MinimumLength = 5, ErrorMessage = "Soru metni en az 5, en fazla 1000 karakter olmalıdır.")]
    string Text,

    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir cevap şablonu seçiniz.")]
    int AnswerTemplateId,

    bool IsActive = true);

public record UpdateQuestionRequest(
    [Required(ErrorMessage = "Soru metni zorunludur.")]
    [StringLength(1000, MinimumLength = 5, ErrorMessage = "Soru metni en az 5, en fazla 1000 karakter olmalıdır.")]
    string Text,

    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir cevap şablonu seçiniz.")]
    int AnswerTemplateId,

    bool IsActive);

// ── Survey DTOs ───────────────────────────────────────────────────────────────
public record SurveyListDto(int Id, string Title, string Description, DateTime StartDate, DateTime EndDate, bool IsActive, int AssignedUserCount, int ResponseCount, List<int> QuestionIds);

public record SurveyDetailDto(int Id, string Title, string Description, DateTime StartDate, DateTime EndDate, bool IsActive,
    List<SurveyQuestionDto> Questions, List<int> AssignedUserIds);

public record SurveyQuestionDto(int Id, int QuestionId, string QuestionText, int OrderIndex, AnswerTemplateDto AnswerTemplate);

public record CreateSurveyRequest(
    [Required(ErrorMessage = "Anket başlığı zorunludur.")]
    [StringLength(300, MinimumLength = 3, ErrorMessage = "Başlık en az 3, en fazla 300 karakter olmalıdır.")]
    string Title,

    [Required(ErrorMessage = "Açıklama zorunludur.")]
    [StringLength(2000, ErrorMessage = "Açıklama en fazla 2000 karakter olabilir.")]
    string Description,

    [Required(ErrorMessage = "Başlangıç tarihi zorunludur.")]
    DateTime StartDate,

    [Required(ErrorMessage = "Bitiş tarihi zorunludur.")]
    DateTime EndDate,

    bool IsActive,

    [Required(ErrorMessage = "En az bir soru seçilmelidir.")]
    [MinLength(1, ErrorMessage = "En az bir soru seçilmelidir.")]
    List<int> QuestionIds,

    [Required(ErrorMessage = "Kullanıcı listesi zorunludur.")]
    List<int> UserIds);

public record UpdateSurveyRequest(
    [Required(ErrorMessage = "Anket başlığı zorunludur.")]
    [StringLength(300, MinimumLength = 3, ErrorMessage = "Başlık en az 3, en fazla 300 karakter olmalıdır.")]
    string Title,

    [Required(ErrorMessage = "Açıklama zorunludur.")]
    [StringLength(2000, ErrorMessage = "Açıklama en fazla 2000 karakter olabilir.")]
    string Description,

    [Required(ErrorMessage = "Başlangıç tarihi zorunludur.")]
    DateTime StartDate,

    [Required(ErrorMessage = "Bitiş tarihi zorunludur.")]
    DateTime EndDate,

    bool IsActive,

    [Required(ErrorMessage = "En az bir soru seçilmelidir.")]
    [MinLength(1, ErrorMessage = "En az bir soru seçilmelidir.")]
    List<int> QuestionIds,

    [Required(ErrorMessage = "Kullanıcı listesi zorunludur.")]
    List<int> UserIds);

// ── Survey Fill DTOs ──────────────────────────────────────────────────────────
public record UserSurveyListDto(int Id, string Title, string Description, DateTime StartDate, DateTime EndDate, bool IsCompleted, List<SurveyQuestionDto> Questions);

public record UserAnswerDto(int QuestionId, int AnswerOptionId);

public record SubmitSurveyRequest(
    int SurveyId,

    [Required(ErrorMessage = "En az bir cevap gönderilmelidir.")]
    [MinLength(1, ErrorMessage = "En az bir cevap gönderilmelidir.")]
    List<SurveyAnswerRequest> Answers);

public record SurveyAnswerRequest(
    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir soru seçiniz.")]
    int QuestionId,

    [Range(1, int.MaxValue, ErrorMessage = "Geçerli bir seçenek işaretleyiniz.")]
    int AnswerOptionId);

// ── Report DTOs ───────────────────────────────────────────────────────────────
public record SurveyReportDto(int SurveyId, string Title, int TotalAssigned, int TotalCompleted, int TotalPending,
    List<UserResponseDto> CompletedResponses, List<UserDto> PendingUsers);

public record UserResponseDto(int UserId, string UserName, string UserEmail, DateTime SubmittedAt, List<AnswerDetailDto> Answers);

public record AnswerDetailDto(int QuestionId, string QuestionText, string AnswerText);

// ── Common ────────────────────────────────────────────────────────────────────
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize);

public record ApiResponse<T>(bool Success, string? Message, T? Data);