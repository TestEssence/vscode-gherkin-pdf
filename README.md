# Gherkin PDF

[![Version](https://vsmarketplacebadge.apphb.com/version/testessence.gherkin-pdf.svg)](https://marketplace.visualstudio.com/items?itemName=testessence.gherkin-pdf)

Gherkin converter extension for Visual Studio Code. This extension converts Gherkin (.feature) files to markdown, pdf, html, png or jpeg files.

## Features

Generats a Markdown/HTML/PDF document from Gherkin with the following features:

- Syntax highlighting
- Table formatting
- Document template (Header and Footer) customization
- Feature Summary (Feature Summary Template) and Scenario Footer (Scenario Footer Template) customization

> To enable Gherkin highlighting in Visual Code editor install a corresponding extension like [Cucumber (Gherkin) Syntax and Snippets](https://github.com/euclidity/vscode-cucumber)

## Install

Chromium download starts automatically when Gherkin PDF is installed and .feature file is first opened with Visual Studio Code.
However, it is time-consuming depending on the environment because of its large size (~ 170Mb Mac, ~ 282Mb Linux, ~ 280Mb Win).
During downloading, the message Installing Chromium is displayed in the status bar.
If you are behind a proxy, set the http.proxy option to settings.json and restart Visual Studio Code.
If the download is not successful or you want to avoid downloading every time you upgrade Gherkin PDF, please specify the installed Chrome or 'Chromium' with gherkin-pdf.executablePath option.

## Usage

### Command Palette

Open the Feature file
Press F1 or Ctrl+Shift+P
Type export and select one of the options listed below

- gherkin-pdf: Export (pdf)
- gherkin-pdf: Export (html)
- gherkin-pdf: Export (png)
- gherkin-pdf: Export (jpeg)
- gherkin-pdf: Export (md)
- gherkin-pdf: Export (all: pdf, html, png, jpeg)
- gherkin-pdf: Open Settings (JSON)

## License

MIT

## Special thanks

- [Markdown PDF](https://github.com/yzane/vscode-markdown-pdf): This extension is created based on _Markdown PDF_ by yzane
- [GoogleChrome/puppeteer](https://github.com/GoogleChrome/puppeteer)
- [markdown-it/markdown-it](https://github.com/markdown-it/markdown-it)
