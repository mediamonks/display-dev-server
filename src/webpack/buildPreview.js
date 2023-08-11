const fs = require("fs-extra");
const path = require("path");

const chalk = require("chalk");
const webpack = require("webpack");
// const HtmlWebpackPlugin = require("html-webpack-plugin");
const archiver = require("archiver");
const globPromise = require("glob-promise");
const cliProgress = require("cli-progress");

// const getTemplate = require("../util/getPreviewTemplate");
const removeTempRichmediaRc = require("../util/removeTempRichmediaRc");
const getNameFromLocation = require("../util/getNameFromLocation");
// const previewWebackConfig = require("../preview/webpack.config");
// const displayAdsRecorder = require("@mediamonks/display-ads-recorder");
const htmlParser = require("node-html-parser");


const getFilesizeInBytes = (filename) => {
  var stats = fs.statSync(filename);
  var fileSizeInBytes = stats.size;
  return fileSizeInBytes;
};

module.exports = async function buildPreview(result, outputDir) {
  // // render backup images
  // if (result[0].settings.data.settings.displayAdsRecorder) {
  //   const locations = result.map((result) => {
  //     const name = result.settings.data.settings.bundleName || getNameFromLocation(result.settings.location); // if bundlename does not exist, get the name from the location instead
  //     const location = `${outputDir}/${name}/index.html`;
  //     return location;
  //   });
  //   await displayAdsRecorder({
  //     targetDir: outputDir,
  //     adSelection: {
  //       location: locations,
  //       ...result[0].settings.data.settings.displayAdsRecorder,
  //     },
  //   });
  // }

  // get list of all files (zips, jpg, etc) in output dir
  const filesInOutputDir = await fs.promises.readdir(outputDir);

  // find all ads in directory
  const allIndexHtmlFiles = await globPromise(`${outputDir}/**/index.html`);

  const allAds = allIndexHtmlFiles.reduce((acc, filename, i) => {
    const rawData = fs.readFileSync(filename, "utf8");
    const parsed = htmlParser.parse(rawData);

    if (parsed.querySelectorAll('meta[name="ad.size"]').length > 0) {
      const dimensions = parsed.querySelector('meta[name="ad.size"]').getAttribute('content').split(',').reduce((acc, attr) => {
        const keyVal = attr.split('=');
        return {
          ...acc,
          [keyVal[0]]: keyVal[1]
        }
      }, {});

      const bundleName = path.basename(path.dirname(filename));
      const bundleParentDir = path.resolve(path.dirname(filename), '../');
      const filesInParentDir = fs.readdirSync(bundleParentDir);

      const additionalOutputs = filesInParentDir.reduce((acc, file) => {
        const fileStats = fs.statSync(path.resolve(bundleParentDir, file));
        if (fileStats.isFile() && file.includes(bundleName)) {
          const fileType = path.extname(file).split('.')[1];
          const additionalOutputObj = {
            [fileType]: {
              // url: file,
              url: path.relative(outputDir, path.resolve(bundleParentDir, file)).replace(/\\/g, "/"),
              size: fileStats.size
            }
          }

          return {
            ...acc,
            ...additionalOutputObj
          }

        } else {
          return acc;
        };
      }, {})


      return [
        ...acc,
        {
          bundleName,
          ...dimensions,
          maxFileSize: result[i].settings.data.settings.maxFileSize,
          output: {
            html: {
              url: path.relative(outputDir, filename).replace(/\\/g, "/")
            },
            ...additionalOutputs
          },
        }
      ]
    } else {
      return acc;
    }
  }, [])


  const adsList = {
    timestamp: Date.now(),
    ads: allAds
  };

  console.log(`found ${allAds.length} for previews.`)

  // copy preview folder
  console.log("copying preview files...");
  fs.copySync(path.join(__dirname, `../preview/dist`), outputDir, {
    overwrite: true,
  });

  // write the result to ads.json in the preview dir
  console.log(`creating ${outputDir}/data/ads.json`)
  fs.outputFileSync(path.resolve(outputDir, 'data/ads.json'), JSON.stringify(adsList, null, 2));

  // write the zip file containing all zips

  // console.log(adsList.ads)
  if (adsList.ads.filter(ad => ad.output.zip).length > 0) {
    await new Promise((resolve) => {
      const output = fs.createWriteStream(outputDir + "/all.zip");
      output.on("close", resolve);
      const archive = archiver("zip", {
        zlib: {level: 9}, // Sets the compression level.
      });
      archive.pipe(output);
      adsList.ads.forEach((ad) => archive.file(path.resolve(outputDir, ad.output.zip.url), {name: path.basename(ad.output.zip.url)}));
      archive.finalize();
    });
  }

  // return {
  //   outputDir: path.resolve(outputDir),
  //   ads: buildResult,
  // };
};
