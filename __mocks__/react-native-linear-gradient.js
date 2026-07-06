const React = require('react');
const { View } = require('react-native');

module.exports = function LinearGradient(props) {
  return React.createElement(View, props, props.children);
};
