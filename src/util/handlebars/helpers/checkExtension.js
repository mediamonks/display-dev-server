module.exports = function (value, checkStr, options) {
  let arr = checkStr.split('|');
  
  for(let item of arr){
    if(value.endsWith(item)){
      return options.fn(this);
    }
  }

  return options.inverse(this);

  // if(value.endsWith('.png') || value.endsWith('.jpg') || value.endsWith('.jpeg')){
  //   return options.fn(this);
  // } else {
  //   return options.inverse(this);
  // }
};
