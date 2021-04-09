# Build Instructions

- Run `npm install` in terminal to install dependencies
- Run `npm install -g vsce` in terminal to install "Visual Studio Code Extensions", a command-line tool for packaging, publishing and managing VS Code extensions

Usage#
You can use vsce to easily package and publish your extensions:

```
$ cd myExtension
$ vsce package
# myExtension.vsix generated
$ vsce publish
# <publisherID>.myExtension published to VS Code Marketplace
```
