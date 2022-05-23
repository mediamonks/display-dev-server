// const loaderUtils = require('loader-utils');
const leafs = require('../../util/leafs');
const isFile = require('../../util/isFile');

module.exports = function customLoader(content) {

  const callback = this.async();
  const options = this.getOptions();

  console.log('Running custom Loader')

  if (content.indexOf('replaceThisWithRichMediaConfig') >= 1) {

    // remove paths from config
    leafs(options.config, function(value, obj, name, path) {
      if (isFile(value)) {
        delete obj[name]
      }
    });

    content = content.replace('\'replaceThisWithRichMediaConfig\'', JSON.stringify(options.config));

  }

  callback(null, content);

};
