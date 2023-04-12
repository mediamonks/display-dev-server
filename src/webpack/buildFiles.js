const fs = require("fs-extra");
const path = require("path");

const chalk = require("chalk");
const webpack = require("webpack");
const cliProgress = require("cli-progress");

const removeTempRichmediaRc = require("../util/removeTempRichmediaRc");

module.exports = async function buildFiles(result, outputDir, chunkSize = 10) {
  const startTime = new Date().getTime();
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(result.length, 0);
  let buildResult = [];

  function webpackRun(config) {
    return new Promise((resolve) => {
      const compiler = webpack(config.webpack);
      compiler.run((err, stats) => {
        if (err) {
          console.error(err.stack || err);
          if (err.details) {
            err.details.forEach((item, index) => {
              console.error(index, item.message);
            });
          }
          return;
        }

        const info = stats.toJson();

        if (stats.hasErrors()) {
          info.errors.forEach((item, index) => {
            console.log(chalk.red(item.message));
          });
        }

        if (stats.hasWarnings()) {
          info.warnings.forEach((item) => {
            console.log(chalk.green(item.message));
          });
        }
        resolve(config);
      });
    });
  }

  const resultChunks = result.reduce((resultArray, item, index) => {
    const chunkIndex = Math.floor(index / chunkSize);
    if (!resultArray[chunkIndex]) {
      resultArray[chunkIndex] = []; // start a new chunk
    }
    resultArray[chunkIndex].push(item);
    return resultArray;
  }, []);

  for (const [index, resultChunk] of resultChunks.entries()) {
    const promiseArray = resultChunk.map((result) => {
      return webpackRun(result);
    });

    const newResults = await Promise.all(promiseArray);
    buildResult = buildResult.concat(newResults);

    progressBar.update(buildResult.length);
  }

  progressBar.stop();
  console.log(`built in ${new Date().getTime() - startTime}ms`);

  // final clean up
  console.log("Removing temp .richmediarc...");
  removeTempRichmediaRc(result);

  const tmpDirPath = path.resolve(process.cwd(), '_temp');
  if (fs.pathExistsSync(tmpDirPath)) {
    await fs.emptyDir(tmpDirPath)
    await fs.rmdir(tmpDirPath)
  }

  return {
    outputDir: path.resolve(outputDir),
    ads: buildResult,
  };
};
