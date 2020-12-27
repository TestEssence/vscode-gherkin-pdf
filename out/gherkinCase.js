"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GherkinCase = void 0;
class GherkinCase {
    constructor(featureCode, mode) {
        this.shouldCountScenario = false;
        this.scenariosNumber = 0;
        this.tablesNumber = 0;
        this.md = "";
        this.regexpScenarioTitle = /^\s+((Scenario:|Scenario Outline:)(.*?))$/mig;
        this.linebreakPlaceholder = '<LINEBREAK>';
        this.featureCode = featureCode;
        this.scenariosNumber = 0;
        this.tablesNumber = 0;
        this.md = this.convertToMarkdown();
    }
    getMarkdown() { return this.md; }
    convertToMarkdown() {
        var text = this.featureCode;
        var scenarioCounter = 1;
        var match;
        do {
            match = this.regexpScenarioTitle.exec(text);
            if (match) {
                var scenarioType = match[2];
                var scenarioName = match[3];
                var scenarioHeader = match[1];
                var scenarioCounterText = this.shouldCountScenario ? " " + scenarioCounter + ":" : "";
                var newScenarioHeader = "\r\n```\r\n## " + scenarioType + scenarioCounterText + scenarioName + " \r\n```Gherkin\r\n";
                scenarioCounter++;
                text = text.replace(scenarioHeader, newScenarioHeader);
                //console.log(match[1]);
            }
        } while (match);
        this.scenariosNumber = scenarioCounter - 1;
        text = "```gherkin\r\n" + text + "\r\n```";
        //highlight Feature as header
        text = text.replace(/^\s*(Feature:.*?)$/gm, '```\r\n# $1\r\n```gherkin');
        text = text.replace(/^\s*(Background:.*?)$/gm, '```\r\n## $1\r\n```gherkin');
        text = text.replace(/^\s*(Examples:.*?)$/gm, '```\r\n### $1\r\n```gherkin');
        text = this.formatTables(text);
        //remove emtry gherkin blocks
        text = text.replace(/^\s*```gherkin\s*```/gmi, '');
        return text;
    }
    formatTables(text) {
        var featureText = text.replace(/\|\s*$\s*\|/gmi, '\|' + this.linebreakPlaceholder + '\|');
        var tableRegex = /^\s*(\|.*?\|)\s*$/gmi;
        var match;
        do {
            match = tableRegex.exec(featureText);
            if (match) {
                var tableText = match[1];
                featureText = featureText.replace(tableText, this.formatTable(tableText));
                this.tablesNumber++;
            }
        } while (match);
        return featureText;
    }
    formatTable(tableText) {
        var tableRows = tableText.split(this.linebreakPlaceholder);
        if (tableRows.length == 0)
            return ""; //table format seems to be broken...
        var formattedTable = '```\r\n' + tableRows[0] + '\r\n';
        formattedTable += this.getMdDividerRow(this.getColumnsNumber(tableRows[0])) + '\r\n';
        for (var i = 1; i < tableRows.length; i++)
            formattedTable += tableRows[i] + '\r\n';
        return (formattedTable + '```gherkin\r\n').replace(/\</, '&lt;').replace(/\>/, '&gt;');
    }
    getMdDividerRow(columnsNumber) {
        var row = '|';
        for (var i = 0; i < columnsNumber; i++) {
            row += ' --- |';
        }
        return row;
    }
    getColumnsNumber(tableRow) {
        return (tableRow.match(/\|/g) || []).length - 1;
    }
}
exports.GherkinCase = GherkinCase;
//# sourceMappingURL=gherkinCase.js.map