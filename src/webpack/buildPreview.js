const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");
const globPromise = require("glob-promise");
const getNameFromLocation = require("../util/getNameFromLocation");
const htmlParser = require("node-html-parser");

module.exports = async function buildPreview(result, outputDir) {
  // find all ads in directory
  const allIndexHtmlFiles = await globPromise(`${outputDir}/**/index.html`);

  allIndexHtmlFiles.sort()
  if (result) {
    result.forEach(e => e.settings.data.settings.bundleName ??= getNameFromLocation(e.settings.location))
    result.sort((a, b) => a.settings.data.settings.bundleName > b.settings.data.settings.bundleName ? 1 : -1)
  }

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
        } else if (file === bundleName) {
          return {
            ...acc,
            unzip: {
              size: sizeSync(path.resolve(bundleParentDir, file))
            }
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
          maxFileSize: result && result[i].settings.data.settings.maxFileSize,
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
};

function sizeSync(p) {
  const stat = fs.statSync(p);
  if (stat.isFile())
    return stat.size;
  else if (stat.isDirectory())
    return fs.readdirSync(p).reduce((a, e) => a + sizeSync(path.join(p, e)), 0);
  else return 0; // can't take size of a stream/symlink/socket/etc
}
