'use strict';

const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver')

module.exports = class ZipFilesPlugin {
  constructor(options) {
    this.options = options;
  }

  async optimizeToSize(srcDir, outputPath, filename, maxAllowedSize, quality = 100) {

    if (quality <= 1) throw new Error('did not work')

    console.log(`creating bundle with ${quality} quality level...`)

    // first create zip of all files in src directory
    const zippedBundle = await new Promise(async resolve => {

      const output = fs.createWriteStream(path.resolve(outputPath, filename));

      output.on("close", () => {
        resolve(path.resolve(outputPath, filename));
      });

      const archive = archiver("zip", {
        zlib: {level: 9}, // Sets the compression level.
      });

      archive.pipe(output);

      const inputFiles = fs.readdirSync(path.resolve(srcDir))

      await Promise.all(inputFiles.map(async file => {
        return new Promise(async resolve => {
          // console.log(path.extname(file));

          const fileExt = path.extname(file)
          const imageExtArr = ['.jpg', '.png'];

          if (imageExtArr.includes(fileExt)) {
            const buffer = await (async function () {
              const content = await fs.promises.readFile(path.resolve(srcDir, file));
              switch (fileExt) {
                case '.jpg':
                  return await sharp(content).jpeg({
                    quality,
                    mozjpeg: true,
                  }).toBuffer();

                case '.png':
                  return await sharp(content).png({
                    quality,
                    effort: 10,
                  }).toBuffer();
              }
            })();
            archive.append(buffer, {name: file});

          } else {
            archive.file(path.resolve(srcDir, file), {name: file})
          }

          resolve();
        })
      }))
      archive.finalize();
    })

    // check the size of the created zip
    const zippedBundleSize = fs.statSync(zippedBundle).size;
    console.log(`bundle size is ${zippedBundleSize}`)
    // see if it's under the max allowed filesize
    if (zippedBundleSize < maxAllowedSize) {
      return zippedBundle;
    } else {


      console.log('exceeds bundlesize, trying again with -5 quality')
      // await optimizeToSize('./src', './', 'bundle.zip', 150000, 100);

      await optimizeToSize(srcDir, outputPath, filename, maxAllowedSize, quality -= 5)

    }
  }

  // async zipFiles(options, compilation) {
  //   const {outputPath, filename} = this.options;
  //   const inputFilesPath = compilation.compiler.outputPath;
  //   const inputFiles = fs.readdirSync(path.resolve(inputFilesPath))

  //   // write the zip file containing all zips
  //   await new Promise((resolve) => {
  //     const output = fs.createWriteStream(path.resolve(outputPath, filename));
  //     output.on("close", resolve);
  //     const archive = archiver("zip", {
  //       zlib: {level: 9}, // Sets the compression level.
  //     });
  //     archive.pipe(output);
  //     inputFiles.forEach((file) => archive.file(path.resolve(inputFilesPath, file), {name: file}));
  //     archive.finalize();
  //   });
  // }

  apply(compiler) {
    compiler.hooks.afterEmit.tapPromise('ZipFilesPlugin', async compilation => {
      await this.zipFiles(this.options, compilation);
    });
  }
};
