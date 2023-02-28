const sharp = require('sharp');

module.exports = async function (content, map, meta) {
  const callback = this.async();
  const options = this.getOptions();

  /*
  options Object ? output options
  options.quality number  quality, integer 1-100 (optional, default 80)
  options.alphaQuality number  quality of alpha layer, integer 0-100 (optional, default 100)
  options.lossless boolean  use lossless compression mode (optional, default false)
  options.nearLossless boolean  use near_lossless compression mode (optional, default false)
  options.smartSubsample boolean  use high quality chroma subsampling (optional, default false)
  options.effort number  CPU effort, between 0 (fastest) and 6 (slowest) (optional, default 4)
  options.loop number  number of animation iterations, use 0 for infinite animation (optional, default 0)
  options.delay (number  | Array <number >)? delay(s) between animation frames (in milliseconds)
  options.minSize boolean  prevent use of animation key frames to minimise file size (slow) (optional, default false)
  options.mixed boolean  allow mixture of lossy and lossless animation frames (slow) (optional, default false)
  options.force boolean  force WebP output, otherwise attempt to use input format (optional, default true)
  */

  const imgOptions = {
    quality: 90,
    effort: 6
  }

  const optimized = await sharp(content).webp(imgOptions).toBuffer();

  callback(null, optimized);
};

module.exports.raw = true;
