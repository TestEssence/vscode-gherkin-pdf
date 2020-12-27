"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertGherkinToMarkdown = void 0;
function convertGherkinToMarkdown(text, mode) {
    const regexp = /^(@.*?)?^(Scenario:|Scenario Outline:)(.*?)$.*?(?=^(Scenario|@|```|##))/g;
    const scenarioArray = [...text.matchAll(regexp)];
    var scenarioCounter = 0;
    scenarioArray.forEach(element => {
        var scenarioName = element[3];
        var scenarioText = element[0];
        var newScenarioText = "\r\n```\r\n### Scenario " + scenarioCounter + ":" + scenarioName + " \r\n```Gherkin\r\n" + scenarioText;
        scenarioCounter++;
        text = text.replace(scenarioText, newScenarioText);
        text = text.replace(/(^Feature: .*?)/, '```\r\n# $&\r\n```gherkin');
        //Write-Host "Processing Scenario $ScenarioName" -ForegroundColor Cyan
    });
    var featureMarkdown = "```gherkin\r\n" + text + "\r\n```";
    return featureMarkdown;
}
exports.convertGherkinToMarkdown = convertGherkinToMarkdown;
/*
Write-Host "Getting the list od scenarios." -ForegroundColor Cyan
$scenarioselectionpattern = '(?ms)^(@.*?)?^(Scenario:|Scenario Outline:)(.*?)$.*?(?=^(Scenario|@|```|##```))'

$scenarioMatches = 	($FeatureFileContent | Select-String -Pattern $scenarioselectionpattern -AllMatches).Matches
$counter=1
foreach ($match in $scenarioMatches){
    $ScenarioName = $match.Groups[3].Value
    $ScenarioText = $match.Groups[0].Value
    $NewScenarioText = "`r`n```````r`n### Scenario $($counter): $ScenarioName`r`n``````Gherkin`r`n$ScenarioText"
    $counter++
    $NewScenarioText += $VerificationEntry
    $FeatureFileContent = $FeatureFileContent -replace  [regex]::escape($ScenarioText), "$NewScenarioText"
    Write-Host "Processing Scenario $ScenarioName" -ForegroundColor Cyan
}
Write-Host "$($scenarioMatches.Count) scenario(s) found" -ForegroundColor Cyan

$FeatureFileContent = $FeatureFileContent -replace '(?ms)^```Gherkin\s+```', ""
*/ 
//# sourceMappingURL=gherkinconverter.js.map