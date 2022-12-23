module.exports = {
  // Global options:
  verbose: true,
  // Command options:
  build: {
    overwriteDest: true,
    filename: "{name}-{version}.xpi",
  },
  sourceDir: "extension/",
  // ignoreFiles: ["**/test", "**/test/**"],
}
