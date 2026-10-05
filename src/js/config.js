/**
 * Front-end configuration: change this file to point the page at another API.
 *
 * Priority: URL query parameter ?api=http://host/api  >  default value below.
 * Example after deployment:
 *   https://example.com/calculator.html?api=https://api.example.com/api
 */
(function (global) {
  'use strict';

  var DEFAULT_API_BASE = 'http://127.0.0.1:5000/api';

  var apiBase = DEFAULT_API_BASE;
  try {
    var params = new URLSearchParams(global.location.search);
    var fromQuery = params.get('api');
    if (fromQuery) {
      apiBase = fromQuery;
    }
  } catch (error) {
    // Fall back to the default when URLSearchParams is unavailable.
    apiBase = DEFAULT_API_BASE;
  }

  global.CALC_CONFIG = {
    API_BASE: apiBase.replace(/\/+$/, '')
  };
})(window);
