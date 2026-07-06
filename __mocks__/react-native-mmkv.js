const store = new Map();

module.exports = {
  createMMKV: () => ({
    set: (key, value) => store.set(key, value),
    getString: key =>
      typeof store.get(key) === 'string' ? store.get(key) : undefined,
    getBoolean: key =>
      typeof store.get(key) === 'boolean' ? store.get(key) : undefined,
    getNumber: key =>
      typeof store.get(key) === 'number' ? store.get(key) : undefined,
    remove: key => store.delete(key),
    clearAll: () => store.clear(),
    contains: key => store.has(key),
  }),
};
