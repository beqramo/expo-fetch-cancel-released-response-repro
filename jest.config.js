module.exports = {
  testEnvironment: 'node',
  // The `expo` package publishes these files as ES modules; let Babel compile them.
  transformIgnorePatterns: ['/node_modules/(?!expo/build/winter/)'],
};
