using Microsoft.EntityFrameworkCore;
using SurveyApp.Domain.Entities;
using SurveyApp.Domain.Interfaces;

namespace SurveyApp.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<AnswerTemplate> AnswerTemplates => Set<AnswerTemplate>();
    public DbSet<AnswerOption> AnswerOptions => Set<AnswerOption>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Survey> Surveys => Set<Survey>();
    public DbSet<SurveyQuestion> SurveyQuestions => Set<SurveyQuestion>();
    public DbSet<SurveyAssignment> SurveyAssignments => Set<SurveyAssignment>();
    public DbSet<SurveyResponse> SurveyResponses => Set<SurveyResponse>();
    public DbSet<SurveyAnswer> SurveyAnswers => Set<SurveyAnswer>();

    // ── Soft Delete interception ──────────────────────────────────────────────
    // Senkron SaveChanges — soft delete buradan da geçmeli
    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        InterceptSoftDeletes();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    // Asenkron SaveChangesAsync — soft delete buradan da geçmeli
    public override async Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        InterceptSoftDeletes();
        return await base.SaveChangesAsync(cancellationToken);
    }

    // Her iki override'ın ortak soft delete mantığı
    private void InterceptSoftDeletes()
    {
        foreach (var entry in ChangeTracker.Entries<ISoftDeletable>()
                     .Where(e => e.State == EntityState.Deleted))
        {
            entry.State = EntityState.Modified;
            entry.Entity.IsDeleted = true;
            entry.Entity.DeletedAt = DateTime.UtcNow;
        }
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── Global query filters ──────────────────────────────────────────────
        modelBuilder.Entity<User>()         .HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<AnswerTemplate>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Question>()     .HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Survey>()       .HasQueryFilter(e => !e.IsDeleted);

        // ── Entity configurations ─────────────────────────────────────────────
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Role).HasDefaultValue("User");
        });

        modelBuilder.Entity<AnswerOption>(e =>
        {
            e.HasOne(o => o.AnswerTemplate)
             .WithMany(t => t.Options)
             .HasForeignKey(o => o.AnswerTemplateId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Question>(e =>
        {
            e.HasOne(q => q.AnswerTemplate)
             .WithMany(t => t.Questions)
             .HasForeignKey(q => q.AnswerTemplateId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SurveyQuestion>(e =>
        {
            e.HasOne(sq => sq.Survey).WithMany(s => s.SurveyQuestions)
             .HasForeignKey(sq => sq.SurveyId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(sq => sq.Question).WithMany(q => q.SurveyQuestions)
             .HasForeignKey(sq => sq.QuestionId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SurveyAssignment>(e =>
        {
            e.HasOne(sa => sa.Survey).WithMany(s => s.SurveyAssignments)
             .HasForeignKey(sa => sa.SurveyId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(sa => sa.User).WithMany(u => u.SurveyAssignments)
             .HasForeignKey(sa => sa.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(sa => new { sa.SurveyId, sa.UserId }).IsUnique();
        });

        modelBuilder.Entity<SurveyResponse>(e =>
        {
            e.HasOne(sr => sr.Survey).WithMany(s => s.SurveyResponses)
             .HasForeignKey(sr => sr.SurveyId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(sr => sr.User).WithMany(u => u.SurveyResponses)
             .HasForeignKey(sr => sr.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(sr => new { sr.SurveyId, sr.UserId }).IsUnique();
        });

        modelBuilder.Entity<SurveyAnswer>(e =>
        {
            e.HasOne(a => a.SurveyResponse).WithMany(r => r.Answers)
             .HasForeignKey(a => a.SurveyResponseId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.Question).WithMany()
             .HasForeignKey(a => a.QuestionId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.AnswerOption).WithMany(o => o.SurveyAnswers)
             .HasForeignKey(a => a.AnswerOptionId).OnDelete(DeleteBehavior.Restrict);
        });

        // ── Seed ─────────────────────────────────────────────────────────────
        modelBuilder.Entity<User>().HasData(new User
        {
            Id = 1,
            Email = "admin@surveyapp.com",
            PasswordHash = "$2a$11$AJ9ZN6mjQcNBSyQOXXGo1.aASxctJmSDwbItZKPS.CPmZKEbRYACi",
            FullName = "System Admin",
            Role = "Admin",
            IsActive = true,
            IsDeleted = false,
            CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });
    }
}