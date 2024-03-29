
"use strict";

import {GherkinMarkdown} from "feature-to-md/dist/lib/gherkin.md";

const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const url = require("url");
const os = require("os");

var INSTALL_CHECK = false;

function activate(context: { subscriptions: any[] }) {
  init();

  const commands = [
    vscode.commands.registerCommand(
        "extension.gherkin-pdf.settings",
        async function () {
          await gherkinPdf("settings");
        }
    ),
    vscode.commands.registerCommand(
        "extension.gherkin-pdf.pdf",
        async function () {
          await gherkinPdf("pdf");
        }
    ),
    vscode.commands.registerCommand(
        "extension.gherkin-pdf.html",
        async function () {
          await gherkinPdf("html");
        }
    ),
    vscode.commands.registerCommand(
        "extension.gherkin-pdf.png",
        async function () {
          await gherkinPdf("png");
        }
    ),
    vscode.commands.registerCommand(
        "extension.gherkin-pdf.jpeg",
        async function () {
          await gherkinPdf("jpeg");
        }
    ),
    vscode.commands.registerCommand(
        "extension.gherkin-pdf.md",
        async function () {
          await gherkinPdf("md");
        }
    ),
    vscode.commands.registerCommand(
        "extension.gherkin-pdf.all",
        async function () {
          await gherkinPdf("all");
        }
    ),
  ];
  commands.forEach(function (command) {
    context.subscriptions.push(command);
  });

  let isConvertOnSave =
    vscode.workspace.getConfiguration("gherkin-pdf")["convertOnSave"];
  if (isConvertOnSave) {
    let disposable_onsave = vscode.workspace.onDidSaveTextDocument(function () {
      gherkinPdfOnSave();
    });
    context.subscriptions.push(disposable_onsave);
  }
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;

async function gherkinPdf(option_type: string) {
  try {
    // check active window
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("No active Editor!");
      return;
    }

    // check feature mode
    let mode = editor.document.languageId;
    if (mode != "feature") {
      vscode.window.showWarningMessage("It is not a gherkin (feature) mode!");
      return;
    }
    if (option_type === "settings") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:testessence.gherkin-pdf"
      );
      return;
    }
    let uri = editor.document.uri;
    let mdfilename = uri.fsPath;
    let ext = path.extname(mdfilename);
    if (!isExistsPath(mdfilename)) {
      if (editor.document.isUntitled) {
        vscode.window.showWarningMessage("Please save the file!");
        return;
      }
      vscode.window.showWarningMessage("File name does not get!");
      return;
    }

    let types_format = ["html", "pdf", "png", "jpeg", "md"];
    let filename = "";
    let types: string[] = [];
    if (types_format.indexOf(option_type) >= 0) {
      types[0] = option_type;
    } else if (option_type === "settings") {
      let types_tmp =
        vscode.workspace.getConfiguration("gherkin-pdf")["type"] || "pdf";
      if (types_tmp && !Array.isArray(types_tmp)) {
        types[0] = types_tmp;
      } else {
        types =
          vscode.workspace.getConfiguration("gherkin-pdf")["type"] || "pdf";
      }
    } else if (option_type === "all") {
      types = types_format;
    } else {
      showErrorMessage(
        "gherkinPdf() Error 1",
        " Supported formats: html, pdf, png, jpeg, md."
      );
      return;
    }

    // convert and export markdown to pdf, html, png, jpeg
    if (types && Array.isArray(types) && types.length > 0) {
      for (const element of types) {
        let type = element;
        if (types_format.indexOf(type) >= 0) {
          filename = mdfilename.replace(ext, "." + type);
          let text = editor.document.getText();
          let gherkin = new GherkinMarkdown(
            text,
            vscode.workspace.getConfiguration("gherkin-pdf", uri)[
              "scenarioFooterTemplate"
            ] || "",
            vscode.workspace.getConfiguration("gherkin-pdf", uri)[
              "featureSummaryTemplate"
            ] || ""
          );
          var md = gherkin.getMarkdown();
          let content = convertMarkdownToHtml({
            filename: mdfilename,
            type,
            text: md,
          });
          let html = makeHtml(content, uri);
          console.log("html size " + html.length);
          await exportFile(type == "md" ? md : html, filename, type, uri);
        } else {
          showErrorMessage(
            "gherkinPdf() Error 2",
            " Supported formats: html, pdf, png, jpeg, md."
          );
          return;
        }
      }
    } else {
      showErrorMessage(
        "gherkinPdf() Error 3",
        " Supported formats: html, pdf, png, jpeg, md."
      );
      return;
    }
  } catch (error) {
    showErrorMessage("gherkinPdf()", error);
  }
}

function gherkinPdfOnSave() {
  try {
    let editor = vscode.window.activeTextEditor;
    let mode = editor.document.languageId;
    if (mode != "feature") {
      return;
    }
    if (!isgherkinPdfOnSaveExclude()) {
      gherkinPdf("settings");
    }
  } catch (error) {
    showErrorMessage("gherkinPdfOnSave()", error);
  }
}

function isgherkinPdfOnSaveExclude() {
  try {
    let editor = vscode.window.activeTextEditor;
    let filename = path.basename(editor.document.fileName);
    let patterns =
      vscode.workspace.getConfiguration("gherkin-pdf")[
        "convertOnSaveExclude"
      ] || "";
    let pattern: string | RegExp;
    let i: number;
    if (patterns && Array.isArray(patterns) && patterns.length > 0) {
      for (i = 0; i < patterns.length; i++) {
        pattern = patterns[i];
        let re = new RegExp(pattern);
        if (re.test(filename)) {
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    showErrorMessage("isgherkinPdfOnSaveExclude()", error);
  }
}

/**
 * convert markdown to html (markdown-it)
 */
function convertMarkdownToHtml({
  filename,
  type,
  text,
}: {
  filename: any;
  type: string;
  text: string;
}) {
  let grayMatter = require("gray-matter");
  let matterParts = grayMatter(text);

  try {
    try {
      var statusbarmessage = vscode.window.setStatusBarMessage(
        "$(symbol-unit) Converting (convertMarkdownToHtml)..."
      );
      const hljs = require("highlight.js");
      const breaks = setBooleanValue(
          matterParts.data.breaks,
          vscode.workspace.getConfiguration("gherkin-pdf")["breaks"]
      );
      var md = require("markdown-it")({
        html: true,
        breaks: breaks,
        highlight: function (str: string, lang: any) {
          if (lang && hljs.getLanguage(lang)) {
            try {
              str = hljs.highlight(lang, str, true).value;
            } catch (error) {
              str = md.utils.escapeHtml(str);
              showErrorMessage("markdown-it:highlight", error);
            }
          } else {
            str = md.utils.escapeHtml(str);
          }
          return '<pre class="hljs"><code><div>' + str + "</div></code></pre>";
        },
      });
    } catch (error) {
      statusbarmessage.dispose();
      showErrorMessage("require('markdown-it')", error);
    }

    // convert the img src of the markdown
    const cheerio = require("cheerio");
    const defaultRender = md.renderer.rules.image;
    md.renderer.rules.image = function (
      tokens: { [x: string]: any },
      idx: string | number,
      options: any,
      env: any,
      self: any
    ) {
      const token = tokens[idx];
      let href = token.attrs[token.attrIndex("src")][1];
      if (type === "html") {
        href = decodeURIComponent(href).replace(/("|')/g, "");
      } else {
        href = convertImgPath(href, filename);
      }
      
      token.attrs[token.attrIndex("src")][1] = href;
      // pass token to default renderer.
      return defaultRender(tokens, idx, options, env, self);
    };

    if (type !== "html") {
      // convert the img src of the html
      md.renderer.rules.html_block = function (
        tokens: { [x: string]: { content: any } },
        idx: string | number
      ) {
        const html = tokens[idx].content;
        const $ = cheerio.load(html);
        $("img").each(() => {
          const src = $(this).attr("src");
          const href = convertImgPath(src, filename);
          $(this).attr("src", href);
        });
        return $.html();
      };
    }

    // checkbox
    md.use(require("markdown-it-checkbox"));

    // toc
    // https://github.com/leff/markdown-it-named-headers
    let options = {
      slugify: Slug,
    };
    md.use(require("markdown-it-named-headers"), options);

    // markdown-it-container
    // https://github.com/markdown-it/markdown-it-container
    md.use(require("markdown-it-container"), "", {
      validate: function (name: {
        trim: () => { (): any; new (): any; length: any };
      }) {
        return name.trim().length;
      },
      render: function (
        tokens: { [x: string]: { info: string } },
        idx: string | number
      ) {
        if (tokens[idx].info.trim() !== "") {
          return `<div class="${tokens[idx].info.trim()}">\n`;
        } else {
          return `</div>\n`;
        }
      },
    });

    // PlantUML
    // https://github.com/gmunguia/markdown-it-plantuml
    const plantumlOptions = {
      openMarker:
          matterParts.data.plantumlOpenMarker ||
          vscode.workspace.getConfiguration("gherkin-pdf")[
              "plantumlOpenMarker"
              ] ||
          "@startuml",
      closeMarker:
          matterParts.data.plantumlCloseMarker ||
          vscode.workspace.getConfiguration("gherkin-pdf")[
              "plantumlCloseMarker"
              ] ||
          "@enduml",
      server:
          vscode.workspace.getConfiguration("gherkin-pdf")["plantumlServer"] ||
          "",
    };
    md.use(require("markdown-it-plantuml"), plantumlOptions);

    // markdown-it-include
    // https://github.com/camelaissani/markdown-it-include
    // the syntax is :[alt-text](relative-path-to-file.md)
    // https://talk.commonmark.org/t/transclusion-or-including-sub-documents-for-reuse/270/13
    if (
      vscode.workspace.getConfiguration("gherkin-pdf")["markdown-it-include"][
        "enable"
      ]
    ) {
      md.use(require("markdown-it-include"), {
        root: path.dirname(filename),
        includeRe: /:\[.+\]\((.+\..+)\)/i,
      });
    }

    statusbarmessage.dispose();
    return md.render(matterParts.content);
  } catch (error) {
    statusbarmessage.dispose();
    showErrorMessage("convertMarkdownToHtml()", error);
  }
}

/*
 * https://github.com/microsoft/vscode/blob/ca4ceeb87d4ff935c52a7af0671ed9779657e7bd/extensions/markdown-language-features/src/slugify.ts#L26
 */
function Slug(string: string) {
  try {
    return encodeURI(
        string
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-") // Replace whitespace with -
            .replace(
                /[\]\[\!\'\#\$\%\&\(\)\*\+\,\.\/\:\;\<\=\>\?\@\\\^\_\{\|\}\~\`。，、；：？！…—·ˉ¨‘’“”々～‖∶＂＇｀｜〃〔〕〈〉《》「」『』．〖〗【】（）［］｛｝]/g,
                ""
            ) // Remove known punctuators
            .replace(/^\-+/, "") // Remove leading -
            .replace(/\-+$/, "") // Remove trailing -
    );
  } catch (error) {
    showErrorMessage("Slug()", error);
  }
}

/*
 * make html
 */
function makeHtml(data: any, uri: { fsPath: any }) {
  try {
    // read styles
    let style = "";
    style += readStyles(uri);

    // get title
    const title = path.basename(uri.fsPath);

    // read template
    const filename = path.join(__dirname, "../template", "template.html");
    require("puppeteer-core");
    const template = readFile(filename);

    // compile template
    const mustache = require("mustache");

    const view = {
      title: title,
      style: style,
      content: data,
    };
    return mustache.render(template, view);
  } catch (error) {
    showErrorMessage("makeHtml()", error);
  }
}

/*
 * export a html to a html file
 */
function exportHtml(data: any, filename: any) {
  fs.writeFile(filename, data, "utf-8", function (error: any) {
    if (error) {
      showErrorMessage("exportHtml()", error);
    }
  });
}

/*
 * export a file into target format (md-html-pdf)
 */
function exportFile(data: any, filename: string, type: string, uri: any) {
  if (!INSTALL_CHECK) {
    return;
  }
  if (!checkPuppeteerBinary()) {
    showErrorMessage("Chromium or Chrome does not exist!", "");
    return;
  }

  const StatusbarMessageTimeout =
      vscode.workspace.getConfiguration("gherkin-pdf")["StatusbarMessageTimeout"];
  vscode.window.setStatusBarMessage("");
  const exportFilename = getOutputDir(filename, uri);

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "[Gherkin PDF]: Exporting (" + type + ")...",
    },
    async () => {
      try {
        // export html
        if (type == "md") {
          exportHtml(data, exportFilename);
          vscode.window.setStatusBarMessage(
            "$(symbol-unit) " + exportFilename,
            StatusbarMessageTimeout
          );
          return;
        }
        // export html
        if (type == "html") {
          exportHtml(data, exportFilename);
          vscode.window.setStatusBarMessage(
            "$(symbol-unit) " + exportFilename,
            StatusbarMessageTimeout
          );
          return;
        }

        const puppeteer = require("puppeteer-core");
        // create temporary file
        const f = path.parse(filename);
        const tmpfilename = path.join(f.dir, f.name + "_tmp.html");
        exportHtml(data, tmpfilename);
        const puppeteer_launch_options = {
          executablePath:
              vscode.workspace.getConfiguration("gherkin-pdf")[
                  "executablePath"
                  ] || puppeteer.executablePath(),
          args: [
            "--lang=" + vscode.env.language,
            "--no-sandbox",
            "--disable-setuid-sandbox",
          ],
          // Setting Up Chrome Linux Sandbox
          // https://github.com/puppeteer/puppeteer/blob/master/docs/troubleshooting.md#setting-up-chrome-linux-sandbox
        };
        const browser = await puppeteer.launch(puppeteer_launch_options);
        const page = await browser.newPage();
        await page.goto(vscode.Uri.file(tmpfilename).toString(), {
          waitUntil: "networkidle0",
        });
        // generate pdf
        // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagepdfoptions
        if (type == "pdf") {
          // If width or height option is set, it overrides the format option.
          // In order to set the default value of page size to A4, we changed it from the specification of puppeteer.
          const width_option =
              vscode.workspace.getConfiguration("gherkin-pdf", uri)["width"] ||
              "";
          const height_option =
              vscode.workspace.getConfiguration("gherkin-pdf", uri)["height"] ||
              "";
          let format_option = "";
          if (!width_option && !height_option) {
            format_option =
              vscode.workspace.getConfiguration("gherkin-pdf", uri)["format"] ||
              "A4";
          }
          let landscape_option: boolean;
          landscape_option = vscode.workspace.getConfiguration("gherkin-pdf", uri)[
              "orientation"
              ] == "landscape";
          const pdf_options = {
            path: exportFilename,
            scale: vscode.workspace.getConfiguration("gherkin-pdf", uri)[
                "scale"
                ],
            displayHeaderFooter: vscode.workspace.getConfiguration(
                "gherkin-pdf",
                uri
            )["displayHeaderFooter"],
            headerTemplate:
                vscode.workspace.getConfiguration("gherkin-pdf", uri)[
                    "headerTemplate"
                    ] || "",
            footerTemplate:
                vscode.workspace.getConfiguration("gherkin-pdf", uri)[
                    "footerTemplate"
                    ] || "",
            printBackground: vscode.workspace.getConfiguration(
                "gherkin-pdf",
                uri
            )["printBackground"],
            landscape: landscape_option,
            pageRanges:
                vscode.workspace.getConfiguration("gherkin-pdf", uri)[
                    "pageRanges"
                    ] || "",
            format: format_option,
            height:
                vscode.workspace.getConfiguration("gherkin-pdf", uri)["height"] ||
                "",
            width:
                vscode.workspace.getConfiguration("gherkin-pdf", uri)["width"] ||
                "",
            margin: {
              top:
                  vscode.workspace.getConfiguration("gherkin-pdf", uri)["margin"][
                      "top"
                      ] || "",
              right:
                  vscode.workspace.getConfiguration("gherkin-pdf", uri)["margin"][
                      "right"
                      ] || "",
              bottom:
                  vscode.workspace.getConfiguration("gherkin-pdf", uri)["margin"][
                      "bottom"
                      ] || "",
              left:
                  vscode.workspace.getConfiguration("gherkin-pdf", uri)["margin"][
                      "left"
                      ] || "",
            },
          };
          await page.pdf(pdf_options);
        }

        // generate png and jpeg
        // https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagescreenshotoptions
        if (type == "png" || type == "jpeg") {
          // Quality options do not apply to PNG images.
          let quality_option: any;
          if (type == "png") {
            quality_option = undefined;
          }
          if (type == "jpeg") {
            quality_option =
              vscode.workspace.getConfiguration("gherkin-pdf")["quality"] ||
              100;
          }

          // screenshot size
          const clip_x_option =
              vscode.workspace.getConfiguration("gherkin-pdf")["clip"]["x"] ||
              null;
          const clip_y_option =
              vscode.workspace.getConfiguration("gherkin-pdf")["clip"]["y"] ||
              null;
          const clip_width_option =
              vscode.workspace.getConfiguration("gherkin-pdf")["clip"]["width"] ||
              null;
          const clip_height_option =
              vscode.workspace.getConfiguration("gherkin-pdf")["clip"][
                  "height"
                  ] || null;
          let options;
          if (
            clip_x_option !== null &&
            clip_y_option !== null &&
            clip_width_option !== null &&
            clip_height_option !== null
          ) {
            options = {
              path: exportFilename,
              quality: quality_option,
              fullPage: false,
              clip: {
                x: clip_x_option,
                y: clip_y_option,
                width: clip_width_option,
                height: clip_height_option,
              },
              omitBackground:
                vscode.workspace.getConfiguration("gherkin-pdf")[
                  "omitBackground"
                ],
            };
          } else {
            options = {
              path: exportFilename,
              quality: quality_option,
              fullPage: true,
              omitBackground:
                vscode.workspace.getConfiguration("gherkin-pdf")[
                  "omitBackground"
                ],
            };
          }
          await page.screenshot(options);
        }

        await browser.close();

        // delete temporary file
        const debug =
            vscode.workspace.getConfiguration("gherkin-pdf")["debug"] || false;
        if (!debug) {
          if (isExistsPath(tmpfilename)) {
            deleteFile(tmpfilename);
          }
        }

        vscode.window.setStatusBarMessage(
          "$(symbol-unit) " + exportFilename,
          StatusbarMessageTimeout
        );
      } catch (error) {
        showErrorMessage("exportFile()", error);
      }
    } // async
  ); // vscode.window.withProgress
}

function isExistsPath(path: string | any[]) {
  if (path.length === 0) {
    return false;
  }
  try {
    fs.accessSync(path);
    return true;
  } catch (error) {
    reportError(error);
    return false;
  }
}

function reportError(error: any) {
  let message =
  error instanceof Error?
     error.message : String(error);
  console.warn(message);
}

function isExistsDir(dirname: string | any[]) {
  if (dirname.length === 0) {
    return false;
  }
  try {
    if (fs.statSync(dirname).isDirectory()) {
      return true;
    } else {
      console.warn("Directory does not exist!");
      return false;
    }
  } catch (error) {
    reportError(error);
    return false;
  }
}

function deleteFile(path: any) {
  const rimraf = require("rimraf");
  rimraf.sync(path);
}

function getOutputDir(filename: any, resource: { fsPath: any }) {
  try {
    let outputDir: any;
    if (resource === undefined) {
      return filename;
    }
    const outputDirectory =
        vscode.workspace.getConfiguration("gherkin-pdf")["outputDirectory"] || "";
    if (outputDirectory.length === 0) {
      return filename;
    }

    // Use a home directory relative path If it starts with ~.
    if (outputDirectory.indexOf("~") === 0) {
      outputDir = outputDirectory.replace(/^~/, os.homedir());
      mkdir(outputDir);
      return path.join(outputDir, path.basename(filename));
    }

    // Use path if it is absolute
    if (path.isAbsolute(outputDirectory)) {
      if (!isExistsDir(outputDirectory)) {
        showErrorMessage(
          `The output directory specified by the gherkin-pdf.outputDirectory option does not exist.\
          Check the gherkin-pdf.outputDirectory option. ` + outputDirectory,
          ""
        );
        return;
      }
      return path.join(outputDirectory, path.basename(filename));
    }

    // Use a workspace relative path if there is a workspace and gherkin-pdf.outputDirectoryRootPath = workspace
    const outputDirectoryRelativePathFile =
        vscode.workspace.getConfiguration("gherkin-pdf")[
            "outputDirectoryRelativePathFile"
            ];
    let root = vscode.workspace.getWorkspaceFolder(resource);
    if (outputDirectoryRelativePathFile === false && root) {
      outputDir = path.join(root.uri.fsPath, outputDirectory);
      mkdir(outputDir);
      return path.join(outputDir, path.basename(filename));
    }

    // Otherwise look relative to the markdown file
    outputDir = path.join(path.dirname(resource.fsPath), outputDirectory);
    mkdir(outputDir);
    return path.join(outputDir, path.basename(filename));
  } catch (error) {
    showErrorMessage("getOutputDir()", error);
  }
}

function mkdir(path: any) {
  if (isExistsDir(path)) {
    return;
  }
  const mkdirp = require("mkdirp");
  return mkdirp.sync(path);
}

function readFile(filename: string) {
  if (filename.length === 0) {
    return "";
  }
  const encode = "utf-8";
  if (filename.indexOf("file://") === 0) {
    if (process.platform === "win32") {
      filename = filename.replace(/^file:\/\/\//, "").replace(/^file:\/\//, "");
    } else {
      filename = filename.replace(/^file:\/\//, "");
    }
  }
  if (isExistsPath(filename)) {
    return fs.readFileSync(filename, encode);
  } else {
    return "";
  }
}

function convertImgPath(src: string, filename: any) {
  try {
    let href = decodeURIComponent(src);
    href = href.replace(/("|')/g, "").replace(/\\/g, "/").replace(/#/g, "%23");
    const protocol = url.parse(href).protocol;
    if (protocol === "file:" && href.indexOf("file:///") !== 0) {
      return href.replace(/^file:\/\//, "file:///");
    } else if (protocol === "file:") {
      return href;
    } else if (!protocol || path.isAbsolute(href)) {
      href = path
        .resolve(path.dirname(filename), href)
        .replace(/\\/g, "/")
        .replace(/#/g, "%23");
      if (href.indexOf("//") === 0) {
        return "file:" + href;
      } else if (href.indexOf("/") === 0) {
        return "file://" + href;
      } else {
        return "file:///" + href;
      }
    } else {
      return src;
    }
  } catch (error) {
    showErrorMessage("convertImgPath()", error);
  }
}

function makeCss(filename: string) {
  try {
    const css = readFile(filename);
    if (css) {
      return "\n<style>\n" + css + "\n</style>\n";
    } else {
      return "";
    }
  } catch (error) {
    showErrorMessage("makeCss()", error);
  }
}

function readStyles(uri: any) {
  try {
    let includeDefaultStyles: any;
    let style = "";
    let styles = "";
    let filename = "";
    let i: number;

    includeDefaultStyles =
      vscode.workspace.getConfiguration("gherkin-pdf")["includeDefaultStyles"];

    // 1. read the style of the vscode.
    if (includeDefaultStyles) {
      filename = path.join(__dirname, "../styles", "markdown.css");
      //filename = require ("../styles/markdown.css")
      style += makeCss(filename);
    }

    // 2. read the style of the markdown.styles setting.
    if (includeDefaultStyles) {
      styles = vscode.workspace.getConfiguration("markdown")["styles"];
      if (styles && Array.isArray(styles) && styles.length > 0) {
        for (i = 0; i < styles.length; i++) {
          let href = fixHref(uri, styles[i]);
          style +=
            '<link rel="stylesheet" href="' + href + '" type="text/css">';
        }
      }
    }

    // 3. read the style of the highlight.js.
    const highlightStyle =
        vscode.workspace.getConfiguration("gherkin-pdf")["highlightStyle"] || "";
    const ishighlight =
        vscode.workspace.getConfiguration("gherkin-pdf")["highlight"];
    if (ishighlight) {
      if (highlightStyle) {
        const css =
            vscode.workspace.getConfiguration("gherkin-pdf")["highlightStyle"] ||
            "github.css";
        filename = path.join(
          __dirname,
          "../node_modules",
          "highlight.js",
          "styles",
          css
        );
        //filename = require ("../node_modules/highlight.js/styles/tomorrow.css")
        style += makeCss(filename);
      } else {
        //filename = require ("../styles/tomorrow.css")
        filename = path.join(__dirname, "../styles", "tomorrow.css");
        style += makeCss(filename);
      }
    }

    // 4. read the style of the gherkin-pdf.
    if (includeDefaultStyles) {
      filename = path.join(__dirname, "../styles", "gherkin-pdf.css");
      //filename = require ("../styles/gherkin-pdf.css")
      style += makeCss(filename);
    }

    // 5. read the style of the gherkin-pdf.styles settings.
    styles = vscode.workspace.getConfiguration("gherkin-pdf")["styles"] || "";
    if (styles && Array.isArray(styles) && styles.length > 0) {
      for (i = 0; i < styles.length; i++) {
        let href = fixHref(uri, styles[i]);
        style += '<link rel="stylesheet" href="' + href + '" type="text/css">';
      }
    }

    return style;
  } catch (error) {
    showErrorMessage("readStyles()", error);
  }
}

/*
 * vscode/extensions/markdown-language-features/src/features/previewContentProvider.ts fixHref()
 * https://github.com/Microsoft/vscode/blob/0c47c04e85bc604288a288422f0a7db69302a323/extensions/markdown-language-features/src/features/previewContentProvider.ts#L95
 *
 * Extension Authoring: Adopting Multi Root Workspace APIs ?E Microsoft/vscode Wiki
 * https://github.com/Microsoft/vscode/wiki/Extension-Authoring:-Adopting-Multi-Root-Workspace-APIs
 */
function fixHref(resource: { fsPath: any }, href: string) {
  try {
    if (!href) {
      return href;
    }

    // Use href if it is already an URL
    const hrefUri = vscode.Uri.parse(href);
    if (["http", "https"].indexOf(hrefUri.scheme) >= 0) {
      return hrefUri.toString();
    }

    // Use a home directory relative path If it starts with ^.
    if (href.indexOf("~") === 0) {
      return vscode.Uri.file(href.replace(/^~/, os.homedir())).toString();
    }

    // Use href as file URI if it is absolute
    if (path.isAbsolute(href)) {
      return vscode.Uri.file(href).toString();
    }

    // Use a workspace relative path if there is a workspace and gherkin-pdf.stylesRelativePathFile is false
    const stylesRelativePathFile =
        vscode.workspace.getConfiguration("gherkin-pdf")[
            "stylesRelativePathFile"
            ];
    let root = vscode.workspace.getWorkspaceFolder(resource);
    if (stylesRelativePathFile === false && root) {
      return vscode.Uri.file(path.join(root.uri.fsPath, href)).toString();
    }

    // Otherwise look relative to the markdown file
    return vscode.Uri.file(
      path.join(path.dirname(resource.fsPath), href)
    ).toString();
  } catch (error) {
    showErrorMessage("fixHref()", error);
  }
}

function checkPuppeteerBinary() {
  try {
    // settings.json
    let executablePath =
        vscode.workspace.getConfiguration("gherkin-pdf")["executablePath"] || "";
    if (isExistsPath(executablePath)) {
      INSTALL_CHECK = true;
      return true;
    }

    // bundled Chromium
    const puppeteer = require("puppeteer-core");
    executablePath = puppeteer.executablePath();
    return isExistsPath(executablePath);
  } catch (error) {
    showErrorMessage("checkPuppeteerBinary()", error);
  }
}

/*
 * puppeteer install.js
 * https://github.com/GoogleChrome/puppeteer/blob/master/install.js
 */
function installChromium() {
  const StatusbarMessageTimeout =
      vscode.workspace.getConfiguration("gherkin-pdf")["StatusbarMessageTimeout"];
  const puppeteer = require("puppeteer-core");
  const browserFetcher = puppeteer.createBrowserFetcher();
  const revision = require(path.join(
    __dirname,
    "../node_modules",
    "puppeteer-core",
    "package.json"
  )).puppeteer.chromium_revision;
  const revisionInfo = browserFetcher.revisionInfo(revision);
  downloadChromium(browserFetcher, revisionInfo, StatusbarMessageTimeout);
}

function downloadChromium(
  browserFetcher: any,
  revisionInfo: any,
  StatusbarMessageTimeout: Number
) {
  function onSuccess(localRevisions: any[]) {
    console.log("Chromium downloaded to " + revisionInfo.folderPath);
    localRevisions = localRevisions.filter(
      (revision: any) => revision !== revisionInfo.revision
    );
    // Remove previous chromium revisions.
    const cleanupOldVersions = localRevisions.map((revision: any) =>
      browserFetcher.remove(revision)
    );

    if (checkPuppeteerBinary()) {
      INSTALL_CHECK = true;
      statusBarMessage.dispose();
      vscode.window.setStatusBarMessage(
        "$(symbol-unit) Chromium installation succeeded!",
        StatusbarMessageTimeout
      );
      vscode.window.showInformationMessage(
        "[Gherkin PDF] Chromium installation succeeded."
      );
      return Promise.all(cleanupOldVersions);
    }
  }

  function onError(error: any) {
    statusBarMessage.dispose();
    vscode.window.setStatusBarMessage(
      "$(symbol-unit) ERROR: Failed to download Chromium!",
      StatusbarMessageTimeout
    );
    showErrorMessage(
      "Failed to download Chromium! \
      If you are behind a proxy, set the http.proxy option to settings.json and restart Visual Studio Code.",
      error
    );
  }

  function onProgress(downloadedBytes: number, totalBytes: number) {
    const progress = ((downloadedBytes / totalBytes) * 100).toFixed(2);
    vscode.window.setStatusBarMessage(
      "$(symbol-unit) Installing Chromium " + progress + "%",
      StatusbarMessageTimeout
    );
  }

  try {
    vscode.window.showInformationMessage(
      "[Gherkin PDF] Installing Chromium..."
    );
    var statusBarMessage = vscode.window.setStatusBarMessage(
      "$(symbol-unit) Installing Chromium..."
    );

    // proxy setting
    setProxy();

    // download Chromium
    browserFetcher
      .download(revisionInfo.revision, onProgress)
      .then(() => browserFetcher.localRevisions())
      .then(onSuccess)
      .catch(onError);
  } catch (error) {
    showErrorMessage("installChromium()", error);
  }
}

function showErrorMessage(msg: string, error: any) {
  let message
  if (error instanceof Error) message = error.message
  else message = String(error)
  vscode.window.showErrorMessage("ERROR: " + msg);
  console.log("ERROR: " + msg);
  if (error) {
    vscode.window.showErrorMessage(message);
    console.log(message);
  }
}

function setProxy() {
  const https_proxy = vscode.workspace.getConfiguration("http")["proxy"] || "";
  if (https_proxy) {
    process.env.HTTPS_PROXY = https_proxy;
    process.env.HTTP_PROXY = https_proxy;
  }
}

function setBooleanValue(a: boolean, b: any) {
  if (!a) {
    return false;
  } else {
    return a || b;
  }
}

function init() {
  try {
    if (checkPuppeteerBinary()) {
      INSTALL_CHECK = true;
    } else {
      installChromium();
    }
  } catch (error) {
    showErrorMessage("init()", error);
  }
}
