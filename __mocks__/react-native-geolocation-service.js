module.exports = {
  getCurrentPosition: jest.fn(success =>
    success({ coords: { latitude: 19.1, longitude: 72.8 } }),
  ),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
  stopObserving: jest.fn(),
  requestAuthorization: jest.fn(),
  setRNConfiguration: jest.fn(),
};
