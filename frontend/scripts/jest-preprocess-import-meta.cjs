// Jest preprocessing script for import.meta handling (Jest 28+ format)
module.exports = {
  process(src, filename) {
    // Replace import.meta.* with mock values for Jest
    const transformedCode = src
      .replace(/import\.meta\.url/g, '"file://test"')
      .replace(/import\.meta\.env/g, "process.env")
      .replace(/import\.meta\./g, "{hot: false, }.");

    // Return object with code property for Jest 28+
    return {
      code: transformedCode,
    };
  },
};
