using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SurveyApp.Application.DTOs;
using SurveyApp.Application.Interfaces;
using SurveyApp.Domain.Constants;

namespace SurveyApp.API.Controllers;

[ApiController]
[Route("api/my-surveys")]
[Authorize(Roles = Roles.User)]
[Produces("application/json")]
public class MySurveysController : ControllerBase
{
    private readonly IUserSurveyService _service;
    public MySurveysController(IUserSurveyService service) => _service = service;

    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet]
    [ProducesResponseType(typeof(List<UserSurveyListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMySurveys() =>
        Ok(await _service.GetAssignedSurveysAsync(GetUserId()));

    [HttpGet("{surveyId}")]
    [ProducesResponseType(typeof(SurveyDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSurvey(int surveyId)
    {
        var result = await _service.GetSurveyForUserAsync(surveyId, GetUserId());
        return result == null ? NotFound() : Ok(result);
    }

    [HttpGet("{surveyId}/my-answers")]
    [ProducesResponseType(typeof(List<UserAnswerDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyAnswers(int surveyId)
    {
        var answers = await _service.GetMyAnswersAsync(GetUserId(), surveyId);
        return Ok(answers);
    }

    [HttpPost("{surveyId}/submit")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Submit(int surveyId, [FromBody] SubmitSurveyRequest request)
    {
        var userId = GetUserId();
        var submitRequest = request with { SurveyId = surveyId };
        var result = await _service.SubmitSurveyAsync(userId, submitRequest);
        return result
            ? Ok(new { message = "Survey submitted successfully" })
            : BadRequest(new { message = "Survey already completed or not available" });
    }
}