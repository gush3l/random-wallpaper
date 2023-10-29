const path = require('path');
const fs = require('fs');

class Store {
  constructor(isRunningInDev, options) {
    this.userDataPath = isRunningInDev
      ? path.join(path.dirname(__dirname), 'random-wallpaper/data')
      : path.dirname(__dirname);

    this.path = path.join(this.userDataPath, `${options.configName}.json`);
    this.data = this.parseDataFile(this.path, options.defaults);
  }

  /**
   * Get the value of the data property at the specified key
   * @param {string} key - The key to retrieve the value for
   * @returns {*} The value at the specified key
   */
  get(key) {
    return this.data[key];
  }

  /**
   * Set the value of the data property at the specified key to the specified value and save the data to file
   * @param {string} key - The key to set the value for
   * @param {*} val - The value to set at the specified key
   */
  set(key, val) {
    this.data[key] = val;
    this.saveDataToFile();
  }

  /**
   * Get the userDataPath property
   * @returns {string} The userDataPath property
   */
  getStoragePath() {
    return this.userDataPath;
  }

  /**
   * Parse the data file at the specified filePath and return the parsed data or the defaults if parsing fails
   * @param {string} filePath - The path to the file to parse
   * @param {*} defaults - The default value to return if parsing fails
   * @returns {*} The parsed data or the defaults if parsing fails
   */
  parseDataFile(filePath, defaults) {
    try {
      return JSON.parse(fs.readFileSync(filePath));
    } catch (error) {
      return defaults;
    }
  }

  /**
   * Write the data property to the file at the path property
   */
  saveDataToFile() {
    fs.writeFileSync(this.path, JSON.stringify(this.data));
  }
}

module.exports = Store;
