/**
 * 界面交互逻辑：按钮、键盘、历史记录渲染、主题切换。
 *
 * 设计原则：前端不做任何数学运算，输入什么表达式就原样发给后端，
 * 结果、历史、统计全部以后端返回的数据为准。
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

  var OPERATOR_BUTTON_MAP = {
    '×': '*',
    '÷': '/',
    '−': '-'
  };

  /* ------------------------------------------------------------------ */
  /* 初始化                                                              */
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
    setMessage('提示：所有运算都由后端完成，请先启动后端服务。', 'info');
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
  /* 表达式输入                                                          */
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
    setMessage('已清空输入。', 'info');
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
  /* 按钮与键盘                                                          */
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
        return; // 交给输入框自身处理
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
  /* 计算                                                                */
  /* ------------------------------------------------------------------ */

  async function calculate() {
    var expression = elements.expressionInput.value.trim();
    if (!expression) {
      setMessage('请先输入要计算的表达式。', 'error');
      return;
    }

    setBusy(true);
    setMessage('正在请求后端计算…', 'info');
    try {
      var payload = await Api.calculate(expression);
      elements.resultOutput.textContent = String(payload.result);
      state.lastResult = payload.result;
      setMessage('计算成功：' + payload.expression + ' = ' + payload.result, 'success');
      state.page = 1;
      refreshHistory();
      refreshStatistics();
    } catch (error) {
      elements.resultOutput.textContent = '—';
      state.lastResult = null;
      setMessage('计算失败：' + error.message, 'error');
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
      setMessage('还没有可复制的结果。', 'error');
      return;
    }
    var text = String(state.lastResult);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        setMessage('结果 ' + text + ' 已复制到剪贴板。', 'success');
      }, function () {
        setMessage('浏览器拒绝了剪贴板访问，请手动复制。', 'error');
      });
    } else {
      setMessage('当前浏览器不支持自动复制，请手动复制结果：' + text, 'info');
    }
  }

  /* ------------------------------------------------------------------ */
  /* 历史记录                                                            */
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

    // 事件委托：删除按钮与“点击表达式回填”
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
        setMessage('已把历史表达式填回输入框，可继续编辑。', 'info');
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
        '<li class="history__empty">历史记录加载失败：' + escapeHtml(error.message) + '</li>';
    }
  }

  function renderHistory(payload) {
    var items = payload.items || [];
    if (items.length === 0) {
      elements.historyList.innerHTML = '<li class="history__empty">' +
        (state.keyword ? '没有匹配「' + escapeHtml(state.keyword) + '」的历史记录。' : '暂无历史记录，先算一题试试。') +
        '</li>';
    } else {
      var html = items.map(function (item) {
        return '' +
          '<li class="history-item">' +
          '  <div class="history-item__main">' +
          '    <button type="button" class="history-item__expression" data-reuse="' + escapeHtml(item.expression) + '" title="点击填回输入框">' + escapeHtml(item.expression) + '</button>' +
          '    <span class="history-item__equals">=</span>' +
          '    <span class="history-item__result">' + escapeHtml(item.result) + '</span>' +
          '  </div>' +
          '  <div class="history-item__meta">' +
          '    <span class="history-item__id">#' + item.id + '</span>' +
          '    <span class="history-item__time">' + escapeHtml(item.createdAt) + '</span>' +
          '    <button type="button" class="button button--danger button--small" data-delete-id="' + item.id + '">删除</button>' +
          '  </div>' +
          '</li>';
      }).join('');
      elements.historyList.innerHTML = html;
    }

    var totalPages = payload.totalPages || 0;
    var displayPage = totalPages === 0 ? 0 : payload.page;
    elements.pageInfo.textContent = '第 ' + displayPage + ' / ' + totalPages + ' 页 · 共 ' + payload.total + ' 条';
    elements.pagePrev.disabled = payload.page <= 1;
    elements.pageNext.disabled = totalPages === 0 || payload.page >= totalPages;
  }

  async function deleteRecord(id) {
    if (!global.confirm('确定要删除第 ' + id + ' 条历史记录吗？')) {
      return;
    }
    try {
      await Api.deleteHistory(id);
      setMessage('历史记录 #' + id + ' 已从数据库删除。', 'success');
      refreshHistory();
      refreshStatistics();
    } catch (error) {
      setMessage('删除失败：' + error.message, 'error');
    }
  }

  async function clearAllHistory() {
    if (!global.confirm('确定要清空全部历史记录吗？该操作会删除数据库中的所有记录。')) {
      return;
    }
    try {
      var payload = await Api.clearHistory();
      setMessage(payload.message || '已清空历史记录。', 'success');
      state.page = 1;
      refreshHistory();
      refreshStatistics();
    } catch (error) {
      setMessage('清空失败：' + error.message, 'error');
    }
  }

  /* ------------------------------------------------------------------ */
  /* 统计与状态                                                          */
  /* ------------------------------------------------------------------ */

  async function refreshStatistics() {
    try {
      var payload = await Api.getStatistics();
      var stats = payload.statistics;
      elements.historyStats.innerHTML =
        '<span class="stat"><b>' + stats.total + '</b> 条记录</span>' +
        '<span class="stat"><b>' + stats.today + '</b> 条今天</span>' +
        '<span class="stat">最常用运算符 <b>' + escapeHtml(stats.mostUsedOperator || '—') + '</b></span>';
    } catch (error) {
      elements.historyStats.textContent = '统计数据暂不可用';
    }
  }

  async function checkBackendHealth() {
    try {
      await Api.health();
      setBackendStatus(true);
    } catch (error) {
      setBackendStatus(false);
      setMessage('检测到后端服务未启动，此时前端无法得到任何计算结果。请先运行后端：python run.py', 'error');
    }
    if (elements.apiBase) {
      elements.apiBase.textContent = Api.baseUrl;
    }
  }

  function setBackendStatus(online) {
    elements.status.textContent = online ? '后端已连接' : '后端未连接';
    elements.status.className = 'status ' + (online ? 'status--online' : 'status--offline');
  }

  /* ------------------------------------------------------------------ */
  /* 主题                                                                */
  /* ------------------------------------------------------------------ */

  function bindThemeEvents() {
    elements.themeToggle.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        global.localStorage.setItem('calculator.theme', next);
      } catch (error) {
        // 隐私模式下 localStorage 可能不可用，忽略即可
      }
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var isDark = theme === 'dark';
    elements.themeToggle.textContent = isDark ? '☀️ 浅色' : '🌙 深色';
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
  /* 工具函数                                                            */
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

  // 供自动化测试与调试使用
  global.CalculatorApp = {
    state: state,
    calculate: calculate,
    refreshHistory: refreshHistory,
    setExpression: setExpression,
    insertText: insertText,
    clearExpression: clearExpression
  };
})(window, document);
