const React = require('react');

module.exports = {
  __esModule: true,
  default: {
    View: require('react-native').View,
    Text: require('react-native').Text,
    Image: require('react-native').Image,
    ScrollView: require('react-native').ScrollView,
    createAnimatedComponent: Component => Component,
  },
  Easing: {
    inOut: fn => fn,
    ease: jest.fn(),
    linear: jest.fn(),
  },
  useSharedValue: initial => ({ value: initial }),
  useAnimatedStyle: styleFactory => styleFactory(),
  withRepeat: value => value,
  withTiming: value => value,
  withSpring: value => value,
  runOnJS: fn => fn,
  interpolate: (value, _input, output) => output[0],
};
