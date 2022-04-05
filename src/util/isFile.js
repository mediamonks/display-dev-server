const fs = require('fs');

module.exports = function isFile(val) {
  if (fs.existsSync(val)) {
    return true;
  } else {
    return false;
  }
};
