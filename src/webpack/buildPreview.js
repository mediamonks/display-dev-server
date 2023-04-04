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

module.exports = async function buildPreview(outputDir, configs) {

  const maxFileSize = configs[0]?.settings?.data?.settings?.maxFileSize || 150;
  // console.log()

  // get list of all files (zips, jpg, etc) in output dir
  const filesInOutputDir = await fs.promises.readdir(outputDir);

  // find all ads in directory
  const allIndexHtmlFiles = await globPromise(`${outputDir}/**/index.html`);

  const allAds = await allIndexHtmlFiles.reduce(async (acc, filename) => {
    const asyncAcc = await acc;

    const rawData = fs.readFileSync(filename, "utf8");
    const parsed = htmlParser.parse(rawData);
    const adMeta = parsed.querySelector('meta[name="generator"]') || parsed.querySelector('meta[name="ad.size"]');

    if (adMeta) {
      let dimensions;

      if (adMeta.getAttribute('name') === 'ad.size') {
        dimensions = parsed.querySelector('meta[name="ad.size"]').getAttribute('content').split(',').reduce((acc, attr) => {
          const keyVal = attr.split('=');
          return {
            ...acc,
            [keyVal[0]]: keyVal[1]
          }
        }, {});
      } else {
        // [dimensions] = filename.match(/[0-9]+x[0-9]+/i);
        const [dimensionsString] = filename.match(/[0-9]+x[0-9]+/i);
        dimensions = {
          width: dimensionsString.split('x')[0],
          height: dimensionsString.split('x')[1]
        }
      }

      const bundleName = path.basename(path.dirname(filename));
      const bundleParentDir = path.resolve(path.dirname(filename), '../');

      // check if bundlename.zip exists, otherwise zip and create it
      if (fs.existsSync(path.resolve(bundleParentDir, `${bundleName}.zip`))) {
        // zip already exists
      } else {
        // need to create a bundle zip
        await new Promise((resolve) => {
          const output = fs.createWriteStream(path.join(bundleParentDir, `${bundleName}.zip`));
          output.on("close", resolve);
          const archive = archiver("zip", {zlib: {level: 9}});
          archive.pipe(output);
          fs.readdirSync(path.dirname(filename)).forEach((file) => archive.file(path.resolve(path.dirname(filename), file), {name: file}));
          archive.finalize();
        });
      }

      // now read all files in that dir, including the zip files
      const filesInParentDir = fs.readdirSync(bundleParentDir);

      // now map all the additional outputs
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
        ...asyncAcc,
        {
          bundleName,
          ...dimensions,
          output: {
            html: {
              url: path.relative(outputDir, filename).replace(/\\/g, "/")
            },
            ...additionalOutputs
          },
        }
      ]
    } else {
      return asyncAcc;
    }
  }, [])


  console.log(allAds);



  const adsList = {
    maxFileSize: maxFileSize,
    ads: allAds
  };

  console.log(`found ${allAds.length} ads for previews`)

  // copy preview folder
  console.log("copying preview files...");
  fs.copySync(path.join(__dirname, `../preview/dist`), outputDir, {
    overwrite: true,
  });

  // write the result to ads.json in the preview dir
  console.log(`writing ${outputDir}/data/ads.json...`)
  fs.outputFileSync(path.resolve(outputDir, 'data/ads.json'), JSON.stringify(adsList, null, 2));

  // write the zip file containing all zips
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
};
