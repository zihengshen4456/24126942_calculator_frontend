/**
 * Thin wrapper around the back-end REST API.
 *
 * The front end never performs any arithmetic: every function below simply
 * sends a request and returns what the back end answers.
 */
(function (global) {
  'use strict';

  var API_BASE = (global.CALC_CONFIG && global.CALC_CONFIG.API_BASE) || 'http://127.0.0.1:5000/api';

  /**
   * Unified request helper: parses JSON and converts every failure mode into
   * an Error carrying a code, so the UI only needs one try/catch block.
   * @param {string} path API path, for example /calculate
   * @param {object} options fetch options
   * @returns {Promise<object>} parsed JSON payload
   */
  async function request(path, options) {
    var response;
    try {
      response = await fetch(API_BASE + path, options);
    } catch (error) {
      var networkError = new Error(
        'Cannot reach the back-end service. Make sure it is running (' + API_BASE + ')'
      );
      networkError.code = 'NETWORK_ERROR';
      throw networkError;
    }

    var payload = null;
    try {
      payload = await response.json();
    } catch (error) {
      payload = null;
    }

    if (!response.ok || (payload && payload.success === false)) {
      var message = (payload && payload.message) || ('Request failed (HTTP ' + response.status + ')');
      var apiError = new Error(message);
      apiError.code = (payload && payload.code) || 'HTTP_' + response.status;
      apiError.status = response.status;
      throw apiError;
    }
    return payload;
  }

  var CalculatorApi = {
    /** Base URL, shown in the UI to make deployment issues easier to spot. */
    baseUrl: API_BASE,

    /** Health check used by the connection indicator. */
    health: function () {
      return request('/health', { method: 'GET' });
    },

    /**
     * Evaluate an expression. The actual computation happens on the server.
     * @param {string} expression expression typed by the user
     */
    calculate: function (expression) {
      return request('/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expression })
      });
    },

    /**
     * Query the history with optional keyword filtering and pagination.
     * @param {{keyword?: string, page?: number, pageSize?: number}} options
     */
    getHistory: function (options) {
      var opts = options || {};
      var query = new URLSearchParams();
      if (opts.keyword) {
        query.set('keyword', opts.keyword);
      }
      query.set('page', String(opts.page || 1));
      query.set('pageSize', String(opts.pageSize || 10));
      return request('/history?' + query.toString(), { method: 'GET' });
    },

    /** Delete a single history record. */
    deleteHistory: function (id) {
      return request('/history/' + encodeURIComponent(id), { method: 'DELETE' });
    },

    /** Delete every history record (extended feature). */
    clearHistory: function () {
      return request('/history', { method: 'DELETE' });
    },

    /** Aggregated statistics over the history (extended feature). */
    getStatistics: function () {
      return request('/statistics', { method: 'GET' });
    }
  };

  global.CalculatorApi = CalculatorApi;
})(window);
