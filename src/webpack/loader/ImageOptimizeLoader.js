const sharp = require('sharp');
const path = require('path');

module.exports = async function (content, map, meta) {
  const callback = this.async();
  const options = this.getOptions();

  const getOptimizedFile = async (file) => {
    const fileExt = path.extname(file)

    if (fileExt === ".jpg" || fileExt === '.jpeg') {
      return await sharp(content).jpeg({
        quality: 80,
        mozjpeg: true,
      }).toBuffer();
    }

    if (fileExt === ".png") {
      return await sharp(content).png({
        quality: 80,
        effort: 10,
      }).toBuffer();
    }

  }

  const optimized = await getOptimizedFile(this.resourcePath);
  callback(null, optimized);
};

module.exports.raw = true;
