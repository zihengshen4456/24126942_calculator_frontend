/**
 * 前端配置文件：只需修改这里即可切换后端地址。
 *
 * 优先级：URL 查询参数 ?api=http://xxx/api  >  本文件默认值
 * 例如部署到服务器后可以这样访问：
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
    // 环境不支持 URLSearchParams 时静默回退到默认地址
    apiBase = DEFAULT_API_BASE;
  }

  global.CALC_CONFIG = {
    API_BASE: apiBase.replace(/\/+$/, '')
  };
})(window);
