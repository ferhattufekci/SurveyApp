using Microsoft.Extensions.Logging;
using SurveyApp.Application.DTOs;
using SurveyApp.Application.Interfaces;
using SurveyApp.Domain.Exceptions;
using SurveyApp.Domain.Interfaces;

namespace SurveyApp.Application.Services;

public class UserService : IUserService
{
    private readonly IUnitOfWork _uow;
    private readonly ILogger<UserService> _logger;

    public UserService(IUnitOfWork uow, ILogger<UserService> logger)
    {
        _uow = uow;
        _logger = logger;
    }

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

        _logger.LogInformation("User created: {UserId} - {Email} - {Role}", user.Id, user.Email, user.Role);
        return new UserDto(user.Id, user.Email, user.FullName, user.Role, user.IsActive);
    }

    public async Task<UserDto?> UpdateAsync(int id, UpdateUserRequest request)
    {
        var u = await _uow.Users.GetByIdAsync(id);
        if (u == null) return null;

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
                throw new BusinessRuleException(
                    $"Bu kullanıcı {activeUsages.Count} aktif ankete atanmıştır. Pasife almadan önce bu anketleri güncelleyiniz.",
                    activeUsages.Count,
                    $"{names}{more}");
            }
        }

        u.FullName = request.FullName;
        u.IsActive = request.IsActive;
        await _uow.Users.UpdateAsync(u);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("User updated: {UserId}", id);
        return new UserDto(u.Id, u.Email, u.FullName, u.Role, u.IsActive);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var u = await _uow.Users.GetByIdAsync(id);
        if (u == null) return false;

        if (u.Role == "Admin")
        {
            var adminCount = await _uow.Users.GetActiveAdminCountAsync();
            if (adminCount <= 1)
                throw new InvalidOperationException("Sistemde en az bir aktif admin bulunmalıdır. Son admin silinemez.");
        }

        var surveys = await _uow.Surveys.GetAllWithDetailsAsync();
        var usedInSurveys = surveys.Where(s => s.SurveyAssignments.Any(a => a.UserId == id)).ToList();
        if (usedInSurveys.Any())
        {
            var names = string.Join(", ", usedInSurveys.Take(3).Select(s =>
                $"\"{s.Title.Substring(0, Math.Min(40, s.Title.Length))}{(s.Title.Length > 40 ? "..." : "")}\""));
            var more = usedInSurveys.Count > 3 ? $" ve {usedInSurveys.Count - 3} anket daha" : "";
            throw new BusinessRuleException(
                $"Bu kullanıcı {usedInSurveys.Count} ankete atanmıştır ve silinemez.",
                usedInSurveys.Count,
                $"{names}{more}");
        }

        await _uow.Users.DeleteAsync(u);
        await _uow.SaveChangesAsync();

        _logger.LogInformation("User soft-deleted: {UserId}", id);
        return true;
    }
}