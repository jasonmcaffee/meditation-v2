// Returns a Proxy so any style property access returns the key name (for debugging)
// and style objects can be spread without errors.
module.exports = new Proxy(
  {},
  {
    get(_, prop) {
      return prop;
    },
  }
);
