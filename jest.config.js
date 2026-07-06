module.exports = {
  preset: '@react-native/jest-preset',
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|immer|react-redux|@reduxjs)/)',
  ],
  setupFiles: ['react-native-gesture-handler/jestSetup'],
};
