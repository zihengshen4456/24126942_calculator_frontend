/**
 * User interface logic: keypad, keyboard shortcuts, history rendering, theming.
 *
 * Design rule: the front end performs no arithmetic at all. Whatever the user
 * types is sent to the back end as-is, and the result, the history and the
 * statistics are always taken from the API response.
 */
(function (global, document) {
  'use strict';

  var Api = global.CalculatorApi;

  var state = {
    expression: '',
    page: 1,
    pageSize: 10,
    keyword: '',
    totalPages: 0,
    lastResult: null
  };

  var elements = {};

  // The keypad shows × ÷ − while the API uses * / -
  var OPERATOR_BUTTON_MAP = {
    '×': '*',
    '÷': '/',
    '−': '-'
  };

  /* ------------------------------------------------------------------ */
  /* Bootstrap                                                          */
  /* ------------------------------------------------------------------ */

  function init() {
    cacheElements();
    bindKeypadEvents();
    bindKeyboardEvents();
    bindHistoryEvents();
    bindDisplayEvents();
    bindThemeEvents();

    restoreTheme();
    checkBackendHealth();
    refreshHistory();
    refreshStatistics();
    setMessage('All calculations are performed by the back end. Start it with: python run.py', 'info');
  }

  function cacheElements() {
    elements.expressionInput = document.getElementById('expression-input');
    elements.resultOutput = document.getElementById('result-output');
    elements.message = document.getElementById('message');
    elements.status = document.getElementById('connection-status');
    elements.copyResult = document.getElementById('copy-result');
    elements.themeToggle = document.getElementById('theme-toggle');
    elements.scientificPanel = document.getElementById('scientific-panel');
    elements.scientificToggle = document.getElementById('scientific-toggle');
    elements.historyList = document.getElementById('history-list');
    elements.historySearch = document.getElementById('history-search');
    elements.historyRefresh = document.getElementById('history-refresh');
    elements.historyClear = document.getElementById('history-clear');
    elements.historyStats = document.getElementById('history-stats');
    elements.pagePrev = document.getElementById('page-prev');
    elements.pageNext = document.getElementById('page-next');
    elements.pageInfo = document.getElementById('page-info');
    elements.pageSize = document.getElementById('page-size');
    elements.apiBase = document.getElementById('api-base');
  }

  /* ------------------------------------------------------------------ */
  /* Expression input                                                   */
  /* ------------------------------------------------------------------ */

  function setExpression(value) {
    state.expression = value;
    elements.expressionInput.value = value;
  }

  function insertText(text) {
    var input = elements.expressionInput;
    var start = input.selectionStart === null ? input.value.length : input.selectionStart;
    var end = input.selectionEnd === null ? input.value.length : input.selectionEnd;
    var next = input.value.slice(0, start) + text + input.value.slice(end);
    setExpression(next);
    var caret = start + text.length;
    input.focus();
    input.setSelectionRange(caret, caret);
  }

  function backspace() {
    var input = elements.expressionInput;
    var start = input.selectionStart;
    var end = input.selectionEnd;
    if (start === null || (start === 0 && end === 0)) {
      setExpression(input.value.slice(0, -1));
      return;
    }
    if (start === end) {
      start = Math.max(0, start - 1);
    }
    setExpression(input.value.slice(0, start) + input.value.slice(end));
    input.focus();
    input.setSelectionRange(start, start);
  }

  function clearExpression() {
    setExpression('');
    elements.resultOutput.textContent = '—';
    state.lastResult = null;
    setMessage('Input cleared.', 'info');
    elements.expressionInput.focus();
  }

  function bindDisplayEvents() {
    elements.expressionInput.addEventListener('input', function (event) {
      state.expression = event.target.value;
    });
    elements.expressionInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        calculate();
      }
    });
    elements.copyResult.addEventListener('click', copyResult);
  }

  /* ------------------------------------------------------------------ */
  /* Keypad and keyboard                                                */
  /* ------------------------------------------------------------------ */

  function bindKeypadEvents() {
    var keys = document.querySelectorAll('[data-insert]');
    Array.prototype.forEach.call(keys, function (button) {
      button.addEventListener('click', function () {
        var raw = button.getAttribute('data-insert');
        insertText(OPERATOR_BUTTON_MAP[raw] || raw);
      });
    });

    var actions = document.querySelectorAll('[data-action]');
    Array.prototype.forEach.call(actions, function (button) {
      button.addEventListener('click', function () {
        handleAction(button.getAttribute('data-action'));
      });
    });

    elements.scientificToggle.addEventListener('click', function () {
      var hidden = elements.scientificPanel.hasAttribute('hidden');
      if (hidden) {
        elements.scientificPanel.removeAttribute('hidden');
      } else {
        elements.scientificPanel.setAttribute('hidden', '');
      }
      elements.scientificToggle.classList.toggle('is-active', hidden);
      elements.scientificToggle.setAttribute('aria-expanded', String(hidden));
    });
  }

  function handleAction(action) {
    switch (action) {
      case 'calculate':
        calculate();
        break;
      case 'clear':
        clearExpression();
        break;
      case 'backspace':
        backspace();
        break;
      default:
        break;
    }
  }

  function bindKeyboardEvents() {
    document.addEventListener('keydown', function (event) {
      var target = event.target;
      var isTypingField = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
      if (isTypingField && target.id !== 'expression-input') {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      var key = event.key;
      if (key >= '0' && key <= '9') {
        return; // handled by the input element itself
      }
      if (['+', '-', '*', '/', '(', ')', '.', '%', '^', ','].indexOf(key) >= 0) {
        if (document.activeElement !== elements.expressionInput) {
          event.preventDefault();
          insertText(key);
        }
        return;
      }
      if (key === 'Enter') {
        event.preventDefault();
        calculate();
      } else if (key === 'Backspace' && document.activeElement !== elements.expressionInput) {
        event.preventDefault();
        backspace();
      } else if (key === 'Escape') {
        event.preventDefault();
        clearExpression();
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Calculation                                                        */
  /* ------------------------------------------------------------------ */

  async function calculate() {
    var expression = elements.expressionInput.value.trim();
    if (!expression) {
      setMessage('Please enter an expression first.', 'error');
      return;
    }

    setBusy(true);
    setMessage('Requesting the result from the back end…', 'info');
    try {
      var payload = await Api.calculate(expression);
      elements.resultOutput.textContent = String(payload.result);
      state.lastResult = payload.result;
      setMessage('Success: ' + payload.expression + ' = ' + payload.result, 'success');
      state.page = 1;
      refreshHistory();
      refreshStatistics();
    } catch (error) {
      elements.resultOutput.textContent = '—';
      state.lastResult = null;
      setMessage('Calculation failed: ' + error.message, 'error');
      if (error.code === 'NETWORK_ERROR') {
        setBackendStatus(false);
      }
    } finally {
      setBusy(false);
    }
  }

  function setBusy(busy) {
    document.body.classList.toggle('is-busy', busy);
  }

  function copyResult() {
    if (state.lastResult === null) {
      setMessage('There is no result to copy yet.', 'error');
      return;
    }
    var text = String(state.lastResult);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        setMessage('Result ' + text + ' copied to the clipboard.', 'success');
      }, function () {
        setMessage('The browser denied clipboard access. Please copy manually.', 'error');
      });
    } else {
      setMessage('Clipboard is not available in this browser. Result: ' + text, 'info');
    }
  }

  /* ------------------------------------------------------------------ */
  /* History                                                            */
  /* ------------------------------------------------------------------ */

  function bindHistoryEvents() {
    elements.historyRefresh.addEventListener('click', function () {
      refreshHistory();
      refreshStatistics();
    });

    var timer = null;
    elements.historySearch.addEventListener('input', function (event) {
      state.keyword = event.target.value.trim();
      state.page = 1;
      global.clearTimeout(timer);
      timer = global.setTimeout(refreshHistory, 250);
    });

    elements.historyClear.addEventListener('click', clearAllHistory);

    elements.pagePrev.addEventListener('click', function () {
      if (state.page > 1) {
        state.page -= 1;
        refreshHistory();
      }
    });

    elements.pageNext.addEventListener('click', function () {
      if (state.page < state.totalPages) {
        state.page += 1;
        refreshHistory();
      }
    });

    elements.pageSize.addEventListener('change', function (event) {
      state.pageSize = parseInt(event.target.value, 10);
      state.page = 1;
      refreshHistory();
    });

    // Event delegation for the delete buttons and for reusing an expression
    elements.historyList.addEventListener('click', function (event) {
      var deleteButton = event.target.closest('[data-delete-id]');
      if (deleteButton) {
        deleteRecord(parseInt(deleteButton.getAttribute('data-delete-id'), 10));
        return;
      }
      var reuseButton = event.target.closest('[data-reuse]');
      if (reuseButton) {
        setExpression(reuseButton.getAttribute('data-reuse'));
        elements.expressionInput.focus();
        setMessage('Expression loaded back into the input field.', 'info');
      }
    });
  }

  async function refreshHistory() {
    try {
      var payload = await Api.getHistory({
        keyword: state.keyword,
        page: state.page,
        pageSize: state.pageSize
      });
      state.totalPages = payload.totalPages;
      if (state.page > 1 && payload.total === 0) {
        state.page = 1;
      }
      renderHistory(payload);
    } catch (error) {
      elements.historyList.innerHTML =
        '<li class="history__empty">Could not load the history: ' + escapeHtml(error.message) + '</li>';
    }
  }

  function renderHistory(payload) {
    var items = payload.items || [];
    if (items.length === 0) {
      elements.historyList.innerHTML = '<li class="history__empty">' +
        (state.keyword
          ? 'No history matches "' + escapeHtml(state.keyword) + '".'
          : 'No history yet. Try a calculation.') +
        '</li>';
    } else {
      var html = items.map(function (item) {
        return '' +
          '<li class="history-item">' +
          '  <div class="history-item__main">' +
          '    <button type="button" class="history-item__expression" data-reuse="' + escapeHtml(item.expression) + '" title="Click to load this expression">' + escapeHtml(item.expression) + '</button>' +
          '    <span class="history-item__equals">=</span>' +
          '    <span class="history-item__result">' + escapeHtml(item.result) + '</span>' +
          '  </div>' +
          '  <div class="history-item__meta">' +
          '    <span class="history-item__id">#' + item.id + '</span>' +
          '    <span class="history-item__time">' + escapeHtml(item.createdAt) + '</span>' +
          '    <button type="button" class="button button--danger button--small" data-delete-id="' + item.id + '">Delete</button>' +
          '  </div>' +
          '</li>';
      }).join('');
      elements.historyList.innerHTML = html;
    }

    var totalPages = payload.totalPages || 0;
    var displayPage = totalPages === 0 ? 0 : payload.page;
    elements.pageInfo.textContent =
      'Page ' + displayPage + ' / ' + totalPages + ' · ' + payload.total + ' record(s)';
    elements.pagePrev.disabled = payload.page <= 1;
    elements.pageNext.disabled = totalPages === 0 || payload.page >= totalPages;
  }

  async function deleteRecord(id) {
    if (!global.confirm('Delete history record #' + id + '?')) {
      return;
    }
    try {
      await Api.deleteHistory(id);
      setMessage('History record #' + id + ' was deleted from the database.', 'success');
      refreshHistory();
      refreshStatistics();
    } catch (error) {
      setMessage('Delete failed: ' + error.message, 'error');
    }
  }

  async function clearAllHistory() {
    if (!global.confirm('Delete every history record? This removes all rows from the database.')) {
      return;
    }
    try {
      var payload = await Api.clearHistory();
      setMessage(payload.message || 'History cleared.', 'success');
      state.page = 1;
      refreshHistory();
      refreshStatistics();
    } catch (error) {
      setMessage('Clear failed: ' + error.message, 'error');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Statistics and connection status                                   */
  /* ------------------------------------------------------------------ */

  async function refreshStatistics() {
    try {
      var payload = await Api.getStatistics();
      var stats = payload.statistics;
      elements.historyStats.innerHTML =
        '<span class="stat"><b>' + stats.total + '</b> records</span>' +
        '<span class="stat"><b>' + stats.today + '</b> today</span>' +
        '<span class="stat">most used operator <b>' + escapeHtml(stats.mostUsedOperator || '—') + '</b></span>';
    } catch (error) {
      elements.historyStats.textContent = 'Statistics unavailable';
    }
  }

  async function checkBackendHealth() {
    try {
      await Api.health();
      setBackendStatus(true);
    } catch (error) {
      setBackendStatus(false);
      setMessage(
        'The back-end service is not reachable, so the front end cannot produce any result on its own. Start it with: python run.py',
        'error'
      );
    }
    if (elements.apiBase) {
      elements.apiBase.textContent = Api.baseUrl;
    }
  }

  function setBackendStatus(online) {
    elements.status.textContent = online ? 'Back end connected' : 'Back end offline';
    elements.status.className = 'status ' + (online ? 'status--online' : 'status--offline');
  }

  /* ------------------------------------------------------------------ */
  /* Theme                                                              */
  /* ------------------------------------------------------------------ */

  function bindThemeEvents() {
    elements.themeToggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        global.localStorage.setItem('calculator.theme', next);
      } catch (error) {
        // localStorage can be unavailable in private browsing mode
      }
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var isDark = theme === 'dark';
    elements.themeToggle.textContent = isDark ? '☀️ Light' : '🌙 Dark';
    elements.themeToggle.setAttribute('aria-pressed', String(isDark));
  }

  function restoreTheme() {
    var saved = null;
    try {
      saved = global.localStorage.getItem('calculator.theme');
    } catch (error) {
      saved = null;
    }
    if (saved === 'dark' || saved === 'light') {
      applyTheme(saved);
    } else {
      var prefersDark = global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(prefersDark ? 'dark' : 'light');
    }
  }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */

  function setMessage(text, type) {
    elements.message.textContent = text;
    elements.message.className = 'message message--' + (type || 'info');
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  document.addEventListener('DOMContentLoaded', init);

  // Exposed for automated tests and debugging
  global.CalculatorApp = {
    state: state,
    calculate: calculate,
    refreshHistory: refreshHistory,
    setExpression: setExpression,
    insertText: insertText,
    clearExpression: clearExpression
  };
})(window, document);
