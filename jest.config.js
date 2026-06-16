module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: ['./jest.setupAfterEnv.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  moduleNameMapper: {
    '\\.(scss|sass|css)$': '<rootDir>/__mocks__/styleMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-star-rating-widget|react-native-gesture-handler|react-native-reanimated|react-native-safe-area-context|react-native-screens|react-native-vector-icons|react-native-static-safe-area-insets|@react-navigation|@fortawesome)/)',
  ],
};
