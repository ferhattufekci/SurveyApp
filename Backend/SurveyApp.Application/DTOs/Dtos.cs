using System.ComponentModel.DataAnnotations;

namespace SurveyApp.Application.DTOs;

// ── Auth DTOs ─────────────────────────────────────────────────────────────────
public record LoginRequest(
    [Required, EmailAddress, StringLength(256)] string Email,
    [Required, StringLength(128, MinimumLength = 6)] string Password);

public record LoginResponse(string Token, string Email, string FullName, string Role, bool IsActive = true);

// ── User DTOs ─────────────────────────────────────────────────────────────────
public record UserDto(int Id, string Email, string FullName, string Role, bool IsActive);

public record CreateUserRequest(
    [Required, EmailAddress, StringLength(256)]      string Email,
    [Required, StringLength(128, MinimumLength = 6)] string Password,
    [Required, StringLength(200, MinimumLength = 2)] string FullName,
    [Required, RegularExpression("^(Admin|User)$")]  string Role,
    bool IsActive = true);

public record UpdateUserRequest(
    [Required, StringLength(200, MinimumLength = 2)] string FullName,
    bool IsActive);

// ── AnswerTemplate DTOs ───────────────────────────────────────────────────────
public record AnswerOptionDto(int Id, string Text, int OrderIndex);

public record AnswerTemplateDto(int Id, string Name, bool IsActive, List<AnswerOptionDto> Options, int UsedInQuestionsCount = 0);

public record CreateAnswerTemplateRequest(
    [Required, StringLength(200, MinimumLength = 2)] string Name,
    [Required, MinLength(2), MaxLength(4)]           List<string> Options,
    bool IsActive = true);

public record UpdateAnswerTemplateRequest(
    [Required, StringLength(200, MinimumLength = 2)] string Name,
    bool IsActive,
    [Required] List<AnswerOptionUpdateDto> Options);

public record AnswerOptionUpdateDto(int? Id, [Required, StringLength(200, MinimumLength = 1)] string Text, int OrderIndex);

// ── Question DTOs ─────────────────────────────────────────────────────────────
public record QuestionDto(int Id, string Text, bool IsActive, AnswerTemplateDto AnswerTemplate);

public record QuestionListDto(int Id, string Text, bool IsActive, int AnswerTemplateId, string AnswerTemplateName, int UsedInSurveysCount = 0);

public record CreateQuestionRequest(
    [Required, StringLength(1000, MinimumLength = 5)] string Text,
    [Range(1, int.MaxValue)]                          int AnswerTemplateId,
    bool IsActive = true);

public record UpdateQuestionRequest(
    [Required, StringLength(1000, MinimumLength = 5)] string Text,
    [Range(1, int.MaxValue)]                          int AnswerTemplateId,
    bool IsActive);

// ── Survey DTOs ───────────────────────────────────────────────────────────────
public record SurveyListDto(int Id, string Title, string Description, DateTime StartDate, DateTime EndDate, bool IsActive, int AssignedUserCount, int ResponseCount, List<int> QuestionIds);

public record SurveyDetailDto(int Id, string Title, string Description, DateTime StartDate, DateTime EndDate, bool IsActive,
    List<SurveyQuestionDto> Questions, List<int> AssignedUserIds);

public record SurveyQuestionDto(int Id, int QuestionId, string QuestionText, int OrderIndex, AnswerTemplateDto AnswerTemplate);

public record CreateSurveyRequest(
    [Required, StringLength(300, MinimumLength = 3)] string Title,
    [Required, StringLength(2000)]                   string Description,
    [Required]                                       DateTime StartDate,
    [Required]                                       DateTime EndDate,
    bool IsActive,
    [Required, MinLength(1)]                         List<int> QuestionIds,
    [Required]                                       List<int> UserIds);

public record UpdateSurveyRequest(
    [Required, StringLength(300, MinimumLength = 3)] string Title,
    [Required, StringLength(2000)]                   string Description,
    [Required]                                       DateTime StartDate,
    [Required]                                       DateTime EndDate,
    bool IsActive,
    [Required, MinLength(1)]                         List<int> QuestionIds,
    [Required]                                       List<int> UserIds);

// ── Survey Fill DTOs ──────────────────────────────────────────────────────────
public record UserSurveyListDto(int Id, string Title, string Description, DateTime StartDate, DateTime EndDate, bool IsCompleted, List<SurveyQuestionDto> Questions);

public record UserAnswerDto(int QuestionId, int AnswerOptionId);

public record SubmitSurveyRequest(
    int SurveyId,
    [Required, MinLength(1)] List<SurveyAnswerRequest> Answers);

public record SurveyAnswerRequest(
    [Range(1, int.MaxValue)] int QuestionId,
    [Range(1, int.MaxValue)] int AnswerOptionId);

// ── Report DTOs ───────────────────────────────────────────────────────────────
public record SurveyReportDto(int SurveyId, string Title, int TotalAssigned, int TotalCompleted, int TotalPending,
    List<UserResponseDto> CompletedResponses, List<UserDto> PendingUsers);

public record UserResponseDto(int UserId, string UserName, string UserEmail, DateTime SubmittedAt, List<AnswerDetailDto> Answers);

public record AnswerDetailDto(int QuestionId, string QuestionText, string AnswerText);

// ── Common ────────────────────────────────────────────────────────────────────
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize);

public record ApiResponse<T>(bool Success, string? Message, T? Data);