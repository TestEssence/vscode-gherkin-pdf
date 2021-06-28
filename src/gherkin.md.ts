export class GherkinMarkdown {
  private shouldCountScenario: boolean = false;
  private featureCode: string;
  private scenarioFooter: string;
  private featureSummary: string;
  private scenariosNumber: number = 0;
  private tablesNumber: number = 0;
  private md: string = "";
  private featureAbstract: string = "";
  private ScenarioNameWildcard = "{{SCENARIO_NAME}}";

  private regexpScenarioTitle =
    //   /(^\s*(Rule:|Background:|Scenario:|Scenario Outline:)(.*?)$)/gim;
    /(^((\s*\@.*?)*)\s*(Rule:|Scenario:|Scenario Outline:)(.*?)$)/gim;

  private linebreakPlaceholder = "<LINEBREAK>";

  constructor(
    featureCode: string,
    scenarioFoter: string,
    featureSummary: string
  ) {
    this.featureCode = featureCode;
    this.featureSummary = featureSummary;
    this.scenariosNumber = 0;
    this.tablesNumber = 0;
    this.scenarioFooter = scenarioFoter;
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
    var previousScenarioName = "";
    var match;
    while ((match = this.regexpScenarioTitle.exec(text))) {
      var scenarioType = match[4];
      var scenarioName = match[5];
      var scenarioTags = match[2];
      var scenarioHeader = match[1];
      var scenarioCounterText = this.shouldCountScenario
        ? " " + scenarioCounter + ":"
        : "";
      var newScenarioHeader =
        this.formatTags(scenarioTags) +
        "\r\n## " +
        scenarioType +
        scenarioCounterText +
        scenarioName;
      if (scenarioCounter > 1 && this.scenarioFooter) {
        var footer = this.scenarioFooter.replace(
          this.ScenarioNameWildcard,
          previousScenarioName
        );
        newScenarioHeader = "\r\n" + footer + "\r\n" + newScenarioHeader;
      }

      text = text.replace(
        scenarioHeader,
        this.isolateFromGherkin(newScenarioHeader)
      );
      scenarioCounter++;
      previousScenarioName = scenarioName;
      //console.log(match[1]);
    }
    this.scenariosNumber = scenarioCounter - 1;
    text = "```gherkin\r\n" + text + "```";

    text = text.replace(
      /^\s*(Background:.*?)$/gm,
      this.isolateFromGherkin("## $1")
    );
    text = text.replace(
      /^\s*(Examples:.*?)$/gm,
      this.isolateFromGherkin("### $1")
    );
    text = this.formatTables(text);
    // indent And and But
    text = text.replace(/^\s*(And|But)(.*?)$/gm, "\t$1$2");
    //add a footer to the last scenario
    if (this.scenarioFooter) {
      text +=
        "\r\n" +
        this.scenarioFooter.replace(
          this.ScenarioNameWildcard,
          previousScenarioName
        );
    }
    text = this.removeEmptyGherkinBlocks(text);
    //restore feature abstract
    text = this.insertFeatureAbstract(text);

    return text;
  }

  private removeEmptyGherkinBlocks(text: string) {
    text = text.replace(/^```gherkin\s*\r\n```/gim, "");
    text = text.replace(/(^```gherkin\r\n)\r\n/gim, "$1");
    text = text.replace(/\r\n(\r\n\r\n```)/gim, "$1");
    return text;
  }

  private isolateFromGherkin(text: string) {
    return "\r\n```\r\n" + text + " \r\n```gherkin\r\n";
  }

  private extractFeatureAbstract(text: string) {
    var regexpFeatureDscription =
      /^((\s*\@.*?)*)\s*(Feature:.*?$)(.*?)(?=^\s*(Background|Scenario|Rule|Given|When|#|@|"""))/gms;
    var match = regexpFeatureDscription.exec(text);
    var tags = "";
    if (match) {
      this.featureAbstract = match[4];
      tags = this.formatTags(match[1]);
    }
    return text.replace(
      regexpFeatureDscription,
      this.isolateFromGherkin(tags + "# $3{{FEATURE_DESCRIPTION}}")
    );
  }

  private formatTags(tagText: string) {
    var tags: string[] = [];
    var reg = new RegExp(/(@[\w-]+)/gim);
    var match;
    while ((match = reg.exec(tagText))) {
      tags.push(match[1]);
    }
    return tagText
      ? "<span class='gherkin_tag'>" + tags.join(", ") + "</span>\r\n"
      : "";
  }

  //highlight Feature as header and leave feature description as is
  private insertFeatureAbstract(text: string) {
    var featureAbstract = this.featureAbstract;
    if (this.featureSummary) {
      featureAbstract = "\r\n" + this.featureSummary + "\r\n" + featureAbstract;
    }
    return text.replace("{{FEATURE_DESCRIPTION}}", featureAbstract);
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
