const path = require('path');

module.exports = {
  assets: ['./assets/fonts/'],
  dependencies: {
    // task-2445: the local bridge to the inillucent database. Autolinking reads it from this folder,
    // so it is not in package.json or node_modules.
    'react-native-inillucent': {
      root: path.join(__dirname, 'modules', 'react-native-inillucent'),
    },
  },
};
