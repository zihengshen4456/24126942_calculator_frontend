/**
 * 后端接口封装层。
 *
 * 前端只负责“发请求 + 展示结果”，不参与任何数学运算，
 * 因此所有函数都是对后端 REST 接口的薄封装。
 */
(function (global) {
  'use strict';

  var API_BASE = (global.CALC_CONFIG && global.CALC_CONFIG.API_BASE) || 'http://127.0.0.1:5000/api';

  /**
   * 统一的请求方法：解析 JSON、把后端的错误信息转换成 Error 抛出。
   * @param {string} path 接口路径，例如 /calculate
   * @param {object} options fetch 配置
   * @returns {Promise<object>} 后端返回的 JSON 数据
   */
  async function request(path, options) {
    var response;
    try {
      response = await fetch(API_BASE + path, options);
    } catch (error) {
      var networkError = new Error('无法连接后端服务，请确认后端已启动（' + API_BASE + '）');
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
      var message = (payload && payload.message) || ('请求失败（HTTP ' + response.status + '）');
      var apiError = new Error(message);
      apiError.code = (payload && payload.code) || 'HTTP_' + response.status;
      apiError.status = response.status;
      throw apiError;
    }
    return payload;
  }

  var CalculatorApi = {
    /** 后端地址，便于在界面上展示 */
    baseUrl: API_BASE,

    /** 健康检查，用于展示后端连接状态 */
    health: function () {
      return request('/health', { method: 'GET' });
    },

    /**
     * 计算表达式（核心运算全部由后端完成）
     * @param {string} expression 用户输入的表达式
     */
    calculate: function (expression) {
      return request('/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expression })
      });
    },

    /**
     * 查询历史记录（支持关键字搜索与分页）
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

    /** 删除指定 ID 的历史记录 */
    deleteHistory: function (id) {
      return request('/history/' + encodeURIComponent(id), { method: 'DELETE' });
    },

    /** 清空全部历史记录（扩展功能） */
    clearHistory: function () {
      return request('/history', { method: 'DELETE' });
    },

    /** 获取计算统计信息（扩展功能） */
    getStatistics: function () {
      return request('/statistics', { method: 'GET' });
    }
  };

  global.CalculatorApi = CalculatorApi;
})(window);
