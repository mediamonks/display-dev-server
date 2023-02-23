'use strict';

const fs = require('fs-extra');
const path = require('path');

module.exports = class CopyFilesPlugin {
  constructor(options) {
    this.options = options;
  }

  copyFiles(options, compilation) {
    const outputPath = compilation.compiler.outputPath;
    const inputPath = this.options.fromPath;
    const files = fs.readdirSync(inputPath)

    files.forEach(file => {
      if (!fs.pathExistsSync(path.resolve(outputPath))) fs.mkdirSync(path.resolve(outputPath));
      fs.copyFileSync(path.resolve(inputPath, file), path.resolve(outputPath, file));
    })
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapPromise('CopyFilesPlugin', async compilation => {
      this.copyFiles(this.options, compilation);
    });
  }
};
