using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SurveyApp.Application.DTOs;
using SurveyApp.Application.Interfaces;

namespace SurveyApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
[Produces("application/json")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _service;
    public ReportsController(IReportService service) => _service = service;

    [HttpGet]
    [ProducesResponseType(typeof(List<SurveyListDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll() => Ok(await _service.GetAllSurveysWithStatsAsync());

    [HttpGet("{surveyId}")]
    [ProducesResponseType(typeof(SurveyReportDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetSurveyReport(int surveyId)
    {
        var result = await _service.GetSurveyReportAsync(surveyId);
        return result == null ? NotFound() : Ok(result);
    }
}