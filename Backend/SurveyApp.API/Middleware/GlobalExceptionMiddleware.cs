using System.Net;
using System.Text.Json;

namespace SurveyApp.API.Middleware;

public sealed class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception for {Method} {Path}",
                context.Request.Method, context.Request.Path);

            await WriteErrorResponse(context, ex);
        }
    }

    private static async Task WriteErrorResponse(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = ex switch
        {
            ArgumentException         => (HttpStatusCode.BadRequest,      ex.Message),
            InvalidOperationException => (HttpStatusCode.BadRequest,      ex.Message),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized,  "Unauthorized."),
            KeyNotFoundException      => (HttpStatusCode.NotFound,        "Resource not found."),
            _                         => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };

        context.Response.StatusCode = (int)statusCode;

        var body = JsonSerializer.Serialize(
            new { message },
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        await context.Response.WriteAsync(body);
    }
}