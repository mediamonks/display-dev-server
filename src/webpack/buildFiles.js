const fs = require("fs-extra");
const path = require("path");

const chalk = require("chalk");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const archiver = require("archiver");
const globPromise = require("glob-promise");
const cliProgress = require("cli-progress");

const getTemplate = require("../util/getPreviewTemplate");
const removeTempRichmediaRc = require("../util/removeTempRichmediaRc");
const getNameFromLocation = require("../util/getNameFromLocation");
const previewWebackConfig = require("../preview/webpack.config");
const displayAdsRecorder = require("@mediamonks/display-ads-recorder");

const getFilesizeInBytes = (filename) => {
  var stats = fs.statSync(filename);
  var fileSizeInBytes = stats.size;
  return fileSizeInBytes;
};

module.exports = async function buildFiles(result, buildTarget, chunkSize = 10) {
  const startTime = new Date().getTime();
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
  console.log(`built in ${new Date().getTime() - startTime}ms`);

  // render backup images

  if (result[0].settings.data.settings.displayAdsRecorder) {
    const locations = result.map((result) => {
      const name = result.settings.data.settings.bundleName || getNameFromLocation(result.settings.location); // if bundlename does not exist, get the name from the location instead
      const location = `${buildTarget}/${name}/index.html`;
      return location;
    });
    await displayAdsRecorder({
      targetDir: buildTarget,
      adSelection: {
        location: locations,
        ...result[0].settings.data.settings.displayAdsRecorder,
      },
    });
  }

  console.log("compiling preview...");
  await new Promise((resolve) => {
    webpack(previewWebackConfig).run((err, stats) => {
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
      resolve(previewWebackConfig);
    });
  });

  // copy preview folder
  fs.copySync(path.join(__dirname, `../preview/dist`), buildTarget, {
    overwrite: true,
  });

  // create the ads.json
  const adsList = {
    maxFileSize: result[0].settings.data.settings.maxFileSize || 150,
    ads: result.map((result) => {
      const name = result.settings.data.settings.bundleName || getNameFromLocation(result.settings.location); // if bundlename does not exist, get the name from the location instead
      const adObj = {
        width: result.settings.data.settings.size.width,
        height: result.settings.data.settings.size.height,
        bundleName: name,
        output: {
          html: {
            url: `${name}/index.html`,
            optimizations: result.settings.data.settings.optimizations,
          },
          zip: {
            url: `${name}.zip`,
            size: getFilesizeInBytes(`./${buildTarget}/${name}.zip`),
          },
        },
      };

      if (result.settings.data.settings.displayAdsRecorder) {
        result.settings.data.settings.displayAdsRecorder.output.forEach((ext) => {
          adObj.output[ext] = {
            url: `${name}.${ext}`,
          };
        });
      }

      return adObj;
    }),
  };

  // write the result to ads.json in the preview dir
  fs.outputFileSync(`${buildTarget}/data/ads.json`, JSON.stringify(adsList, null, 2));

  // write the zip file containing all zips
  await new Promise((resolve) => {
    const output = fs.createWriteStream(buildTarget + "/all.zip");
    output.on("close", resolve);

    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });
    archive.pipe(output);

    adsList.ads.forEach((ad) => archive.file(path.resolve(buildTarget, ad.output.zip.url), { name: ad.output.zip.url }));

    archive.finalize();
  });

  // final clean up
  console.log("Removing temp .richmediarc...");
  removeTempRichmediaRc(result);

  return {
    buildTarget: path.resolve(buildTarget),
    ads: buildResult,
  };
};
