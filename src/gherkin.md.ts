export class GherkinMarkdown {
  private shouldCountScenario: boolean = false;
  private featureCode: string;
  private scenariosNumber: number = 0;
  private tablesNumber: number = 0;
  private md: string = "";
  private featureAbstract: string = "";
  private shouldExtractTag: boolean = true;

  private regexpScenarioTitle = /(^\s*(Rule:|Scenario:|Scenario Outline:)(.*?)$)/gim;

  private linebreakPlaceholder = "<LINEBREAK>";

  constructor(featureCode: string, mode: any) {
    this.featureCode = featureCode;
    this.scenariosNumber = 0;
    this.tablesNumber = 0;
    this.md = this.convertToMarkdown();
  }

  public getMarkdown() {
    return this.md;
  }

  private convertToMarkdown() {
    var text = this.featureCode;

    //removing all the leading spaces
    text = text.replace(/^[^\S\r\n]+(.*?)$/gm, "$1");
    text = this.extractFeatureAbstract(text);
    var scenarioCounter = 1;
    var match;
    do {
      match = this.regexpScenarioTitle.exec(text);
      if (match) {
        var scenarioType = match[2];
        var scenarioName = match[3];
        var scenarioHeader = match[1];
        var scenarioCounterText = this.shouldCountScenario
          ? " " + scenarioCounter + ":"
          : "";
        var newScenarioHeader =
          "\r\n```\r\n## " +
          scenarioType +
          scenarioCounterText +
          scenarioName +
          " \r\n```gherkin\r\n";
        scenarioCounter++;
        text = text.replace(scenarioHeader, newScenarioHeader);
        //console.log(match[1]);
      }
    } while (match);
    this.scenariosNumber = scenarioCounter - 1;
    text = "```gherkin\r\n" + text + "```";

    text = text.replace(
      /^\s*(Background:.*?)$/gm,
      "\r\n```\r\n## $1\r\n```gherkin"
    );
    text = text.replace(/^\s*(Examples:.*?)$/gm, "```\r\n### $1\r\n```gherkin");
    text = this.formatTables(text);
    // remove empty lines
    // text = text.replace(/^(?:[\t ]*(?:\r?\n|\r))+/gim, "");
    // indent And and But
    text = text.replace(/^\s*(And|But)(.*?)$/gm, "\t$1$2");
    if (this.shouldExtractTag) text = this.extractTags(text);
    //remove emtry gherkin blocks
    text = text.replace(/^```gherkin\s*\r\n```/gim, "");
    text = text.replace(/(^```gherkin\r\n)\r\n/gim, "$1");
    text = text.replace(/\r\n(\r\n```)/gim, "$1");
    //restore featur eabstract
    text = this.insertFeatureAbstract(text);
    return text;
  }
  private extractFeatureAbstract(text) {
    var regexpFeatureDscription = /^\s*(Feature:.*?$)(.*?)(?=^\s*(Background|Scenario|Rule|Given|When|#|@|"""))/gms;
    var match = regexpFeatureDscription.exec(text);
    if (match) {
      this.featureAbstract = match[2];
    }
    return text.replace(
      regexpFeatureDscription,
      "\r\n```\r\n# $1{{FEATURE_DESCRIPTION}}\r\n```gherkin\r\n"
    );
  }
  private extractTags(text: string) {
    return text.replace(
      /^(@.*?)$/gim,
      "```\r\n<span class='gherkin_tag'>$1</span>\r\n```gherkin\r\n"
    );
  }
  //highlight Feature as header and leave feature description as is
  private insertFeatureAbstract(text: string) {
    return text.replace("{{FEATURE_DESCRIPTION}}", this.featureAbstract);
  }
  private formatTables(text: string) {
    var featureText = text.replace(
      /\|\s*$\s*\|/gim,
      "|" + this.linebreakPlaceholder + "|"
    );
    var tableRegex = /^\s*(\|.*?\|)\s*$/gim;
    var match;
    do {
      match = tableRegex.exec(featureText);
      if (match) {
        var tableText = match[1];
        featureText = featureText.replace(
          tableText,
          this.formatTable(tableText)
        );
        this.tablesNumber++;
      }
    } while (match);
    return featureText;
  }

  private formatTable(tableText: string) {
    var tableRows = tableText.split(this.linebreakPlaceholder);
    if (tableRows.length == 0) return ""; //table format seems to be broken...
    var formattedTable = "\r\n```\r\n" + tableRows[0] + "\r\n";

    formattedTable +=
      this.getMdDividerRow(this.getColumnsNumber(tableRows[0])) + "\r\n";
    for (var i = 1; i < tableRows.length; i++)
      formattedTable += tableRows[i] + "\r\n";
    return (formattedTable + "```gherkin\r\n")
      .replace(/\</g, "&lt;")
      .replace(/\>/g, "&gt;");
  }

  private getMdDividerRow(columnsNumber: number) {
    var row = "|";
    for (var i = 0; i < columnsNumber; i++) {
      row += " --- |";
    }
    return row;
  }

  private getColumnsNumber(tableRow: string) {
    return (tableRow.match(/\|/g) || []).length - 1;
  }
}
