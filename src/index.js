const getWebpackConfigs = require("./webpack/getWebpackConfigs");
const devServer = require("./webpack/devServer");
const devServerParallel = require("./webpack/devServerParallel");
const buildFiles = require("./webpack/buildFiles");
const buildFilesParallel = require("./webpack/buildFilesParallel");
const buildPreview = require("./webpack/buildPreview");

module.exports = async function (options) {
  // {mode = "development", glob = "./**/.richmediarc*", choices = null, stats = null, outputDir = "./build", configOverride = {}}
  let {mode, glob, choices, stats, outputDir, skipBuild, skipPreview, parallel} = options;

  const webpackConfigs = !skipBuild ? await getWebpackConfigs(options) : null;

  if (mode === "development") {
    if (parallel) await devServerParallel(webpackConfigs.result, webpackConfigs.choices.openLocation, options);
    else          await devServer(webpackConfigs.result, webpackConfigs.choices.openLocation);
  } else {
    if (!skipBuild) {
      if (parallel) await buildFilesParallel(webpackConfigs.result, options);
      else          await buildFiles(webpackConfigs.result, outputDir);
    }
    if (!skipPreview) await buildPreview(outputDir);
  }
};
