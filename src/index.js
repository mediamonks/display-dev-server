const getWebpackConfigs = require("./webpack/getWebpackConfigs");
const devServer = require("./webpack/devServer");
const buildFiles = require("./webpack/buildFiles");
const buildPreview = require("./webpack/buildPreview");

module.exports = async function (options) {
  // {mode = "development", glob = "./**/.richmediarc*", choices = null, stats = null, outputDir = "./build", configOverride = {}}
  let {mode, glob, choices, stats, outputDir, skipBuild, skipPreview} = options;

  const webpackConfigs = !skipBuild ? await getWebpackConfigs(options) : null;

  if (mode === "development") {
    await devServer(webpackConfigs.result, webpackConfigs.choices.openLocation);
  } else {
    if (!skipBuild) await buildFiles(webpackConfigs.result, outputDir);
    if (!skipPreview) await buildPreview(webpackConfigs.result, outputDir);
  }
};
