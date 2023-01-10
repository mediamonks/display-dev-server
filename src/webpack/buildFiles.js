const chalk = require("chalk");
const webpack = require("webpack");

const fs = require("fs-extra");
const path = require("path");
const globPromise = require("glob-promise");
const cliProgress = require("cli-progress");
const archiver = require("archiver");

const getTemplate = require("../util/getPreviewTemplate");
const removeTempRichmediaRc = require("../util/removeTempRichmediaRc");

const getFilesizeInBytes = (filename) => {
  var stats = fs.statSync(filename);
  var fileSizeInBytes = stats.size;
  return fileSizeInBytes;
};

module.exports = async function buildFiles(result, buildTarget, chunkSize = 10) {
  const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progressBar.start(result.length, 0);
  let buildResult = [];

  function webpackRun(config) {
    return new Promise((resolve) => {
      webpack(config.webpack).run((err, stats) => {
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

  // copy preview folder
  fs.copySync(path.join(__dirname, `../preview/`), buildTarget, {
    overwrite: true,
  });

  // create the ads.json
  const adsList = {
    ads: result.map((result) => {
      return {
        width: result.settings.data.settings.size.width,
        height: result.settings.data.settings.size.height,
        bundleName: result.settings.data.settings.bundleName,
        output: {
          html: {
            url: `${result.settings.data.settings.bundleName}/index.html`,
            optimizations: result.settings.data.settings.optimizations,
          },
          zip: {
            url: `${result.settings.data.settings.bundleName}.zip`,
            size: getFilesizeInBytes(`./${buildTarget}/${result.settings.data.settings.bundleName}.zip`),
          },
        },
      };
    }),
  };

  // get a list of all the zip files
  //const zipFiles = adsList.map((result) => {
  //  return output.zip.url;
  //});

  // write the result to ads.json in the preview dir
  fs.outputFileSync(`${buildTarget}/data/ads.json`, JSON.stringify(adsList, null, 2));

  // final clean up
  console.log("Removing temp .richmediarc...");
  removeTempRichmediaRc(result);

  return {
    buildTarget: path.resolve(buildTarget),
    ads: buildResult,
  };
};
