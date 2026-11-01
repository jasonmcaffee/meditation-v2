// Autolinking metadata for the local inillucent bridge. The app's react-native.config.js points
// `react-native-inillucent` at this folder, so nothing is installed into node_modules.
module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import com.jasonmcaffee.inillucent.InillucentPackage;',
        packageInstance: 'new InillucentPackage()',
      },
      // The podspec at the root of this folder is found by name.
      ios: {},
    },
  },
};
