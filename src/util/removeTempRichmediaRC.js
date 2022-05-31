const fs = require('fs-extra');

module.exports = function removeTempRichmediaRc (configs) {

  configs.forEach(config => {
    try {
      if (config.settings.willBeDeletedAfterServerCloses) {
        // console.log('checking ' + config.settings.location)
        const fileData = fs.readFileSync(config.settings.location, {encoding: 'utf8'});
        const fileDataJson = JSON.parse(fileData);

        if (config.settings.uniqueHash === fileDataJson.uniqueHash) {
          // console.log('valid. deleting ' + config.settings.location)
          fs.unlinkSync(config.settings.location);
        } else {
          // console.log('not valid.')
        }
      }

    } catch (e) {
      console.log(e);
      console.log('Could not clean up file(s). Manual cleanup needed');
    }
  })


};

