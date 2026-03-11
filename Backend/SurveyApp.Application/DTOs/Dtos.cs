namespace SurveyApp.Application.DTOs;

// Auth DTOs
public record LoginRequest(string Email, string Password);
public record LoginResponse(string Token, string Email, string FullName, string Role);

// User DTOs
public record UserDto(int Id, string Email, string FullName, string Role, bool IsActive);
public record CreateUserRequest(string Email, string Password, string FullName, string Role, bool IsActive = true);
public record UpdateUserRequest(string FullName, bool IsActive);

// AnswerTemplate DTOs
public record AnswerOptionDto(int Id, string Text, int OrderIndex);
public record AnswerTemplateDto(int Id, string Name, bool IsActive, List<AnswerOptionDto> Options);
public record CreateAnswerTemplateRequest(string Name, List<string> Options, bool IsActive = true);
public record UpdateAnswerTemplateRequest(string Name, bool IsActive, List<AnswerOptionUpdateDto> Options);
public record AnswerOptionUpdateDto(int? Id, string Text, int OrderIndex);

// Question DTOs
public record QuestionDto(int Id, string Text, bool IsActive, AnswerTemplateDto AnswerTemplate);
public record QuestionListDto(int Id, string Text, bool IsActive, int AnswerTemplateId, string AnswerTemplateName);
public record CreateQuestionRequest(string Text, int AnswerTemplateId);
public record UpdateQuestionRequest(string Text, int AnswerTemplateId, bool IsActive);

// Survey DTOs
public record SurveyListDto(int Id, string Title, string Description, DateTime StartDate, DateTime EndDate, bool IsActive, int AssignedUserCount, int ResponseCount);
public record SurveyDetailDto(int Id, string Title, string Description, DateTime StartDate, DateTime EndDate, bool IsActive, 
    List<SurveyQuestionDto> Questions, List<int> AssignedUserIds);
public record SurveyQuestionDto(int Id, int QuestionId, string QuestionText, int OrderIndex, AnswerTemplateDto AnswerTemplate);
public record CreateSurveyRequest(string Title, string Description, DateTime StartDate, DateTime EndDate, bool IsActive,
    List<int> QuestionIds, List<int> UserIds);
public record UpdateSurveyRequest(string Title, string Description, DateTime StartDate, DateTime EndDate, bool IsActive,
    List<int> QuestionIds, List<int> UserIds);

// Survey Fill DTOs
public record UserSurveyListDto(int Id, string Title, string Description, DateTime StartDate, DateTime EndDate, bool IsCompleted);
public record SubmitSurveyRequest(int SurveyId, List<SurveyAnswerRequest> Answers);
public record SurveyAnswerRequest(int QuestionId, int AnswerOptionId);

// Report DTOs
public record SurveyReportDto(int SurveyId, string Title, int TotalAssigned, int TotalCompleted, int TotalPending,
    List<UserResponseDto> CompletedResponses, List<UserDto> PendingUsers);
public record UserResponseDto(int UserId, string UserName, string UserEmail, DateTime SubmittedAt, List<AnswerDetailDto> Answers);
public record AnswerDetailDto(int QuestionId, string QuestionText, string AnswerText);

// Common
public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize);
public record ApiResponse<T>(bool Success, string? Message, T? Data);
