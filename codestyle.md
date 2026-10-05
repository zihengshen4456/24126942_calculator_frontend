# 前端代码规范（HTML / CSS / JavaScript）

## 规范来源

本文档的规则来源于以下公开的、被广泛认可的官方或社区标准：

1. [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)（Google JavaScript 编码规范）
2. [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)（Airbnb JavaScript 编码规范）
3. [Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html)（Google HTML / CSS 编码规范）
4. [MDN Web Docs – JavaScript 语言参考](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript)（语义与最佳实践）
5. [Front-End Checklist – naming-conventions](https://github.com/thedaviddias/Front-End-Checklist)（前端命名与工程实践清单）

本项目在上述通用规范的基础上，补充了少量与项目结构相关的约定。

## 1. 通用约定

| 项目 | 约定 |
| --- | --- |
| 缩进 | 2 个空格，禁止使用 Tab |
| 行宽 | 单行不超过 100 个字符 |
| 文件编码 | UTF-8（含中文的页面必须声明 `<meta charset="UTF-8">`） |
| 大小写 | HTML 标签、属性、CSS 选择器统一使用小写 |
| 文件结尾 | 保留一个空行 |

## 2. HTML 规范

- 使用 HTML5 文档类型 `<!DOCTYPE html>`；
- 为页面声明 `lang` 属性（本项目为 `zh-CN`）；
- 标签必须正确闭合，属性值统一使用双引号；
- 语义化优先：使用 `header`、`main`、`section`、`ul`、`button` 等语义标签，不滥用 `div`；
- 交互元素使用 `<button type="button">`，表单控件必须有关联的 `<label>` 或 `aria-label`；
- 图片必须提供 `alt` 属性；装饰性图标使用空 `alt=""`；
- 可访问性：需要动态播报的区域使用 `role="status"` 与 `aria-live="polite"`，
  可展开控件使用 `aria-expanded`。

## 3. CSS 规范

### 3.1 命名规范：BEM

类名采用 [BEM](https://getbem.com/)（Block__Element--Modifier）命名法：

```
.block              块：独立的功能单元，如 .calculator
.block__element     元素：块的组成部分，如 .calculator__keypad
.block--modifier    修饰符：状态或变体，如 .button--danger
```

约定：

- 类名只使用小写字母、数字与连字符，禁止拼音与无意义缩写；
- 禁止使用标签选择器或 `#id` 作为主要样式选择器（`#id` 仅用于 JS 取值）；
- 禁止嵌套超过 2 层的选择器，避免样式难以覆盖与维护；
- 状态类统一使用 `is-` 前缀，例如 `is-active`、`is-busy`。

### 3.2 其他规则

- 颜色、圆角、阴影等统一使用 CSS 变量（定义在 `:root` 中），主题切换只改变量，不改具体规则；
- 属性书写顺序：定位 → 盒模型 → 排版 → 视觉 → 动画；
- 数值为 0 时省略单位；小于 1 的小数省略整数部分的 0（如 `.5`）；
- 避免使用 `!important`；`[hidden]` 之类的浏览器默认样式被覆盖时，
  必须显式补充规则（本项目 `.calculator__scientific[hidden]` 即为此例）。

## 4. JavaScript 规范

### 4.1 基本格式

- 每条语句以分号结尾，字符串统一使用单引号；
- 使用 `const` / `let`，禁止使用 `var`（本项目为兼容旧浏览器而在 IIFE 内使用了 `var`，
  新增代码应优先使用 `const` / `let`）；
- 使用严格模式：文件顶部或 IIFE 内添加 `'use strict';`；
- 禁止使用全局变量污染，模块通过 IIFE 封装后挂载到统一的命名空间上。

### 4.2 命名

| 类型 | 规则 | 示例 |
| --- | --- | --- |
| 变量 / 函数 | 小驼峰（camelCase） | `refreshHistory`、`pageSize` |
| 常量 | 全大写加下划线 | `DEFAULT_API_BASE` |
| 类 | 大驼峰（PascalCase） | `CalculatorApi` |
| 布尔值 | 使用 `is` / `has` / `can` 前缀 | `isBusy`、`hasNext` |
| 私有函数 | 文件内定义的普通函数即可 | `renderHistory` |

### 4.3 函数与异步

- 单个函数尽量不超过 50 行，职责单一；
- 异步请求统一使用 `async` / `await`，不使用回调嵌套；
- 所有网络请求必须处理失败分支，禁止出现「静默失败」；
- 错误对象要携带可判断的信息（如 `error.code`），便于界面区分处理。

### 4.4 网络请求

- 所有接口调用集中封装在 `js/api.js` 中，界面逻辑不得直接调用 `fetch`；
- 接口地址来自 `js/config.js`，不得在业务代码中硬编码 URL；
- 请求统一携带 `Content-Type: application/json`；
- 后端返回 `success: false` 或 HTTP 非 2xx 时，统一抛出异常，由界面层展示提示。

### 4.5 DOM 操作与安全

- 通过 `document.getElementById` / `querySelector` 缓存 DOM 引用，避免重复查询；
- 列表渲染使用事件委托，避免为每个列表项单独绑定事件；
- **所有插入到 `innerHTML` 的数据都必须经过 HTML 转义**（本项目使用 `escapeHtml()`），
  防止 XSS；
- 用户输入不得直接拼接进 `innerHTML`。

## 5. 注释规范

- 每个 JS 文件顶部说明该文件的职责；
- 公开函数使用 JSDoc 风格注释说明参数与返回值；
- 注释解释「为什么」，而不是重复代码字面含义；
- 中文注释与英文标识符混排时，标识符保持英文，说明文字使用中文。

## 6. 目录与文件组织

- 结构、样式、逻辑分离：HTML 不写内联样式与内联事件，CSS 不写业务逻辑，JS 不写样式；
- 三个 JS 文件职责划分：`config.js` 配置、`api.js` 网络、`app.js` 交互；
- 文件名全小写，多个单词用连字符或直接连写（如 `calculator.html`、`style.css`）。

## 7. 可访问性与兼容性

- 所有可交互元素必须可以通过键盘操作（本项目支持数字、运算符、Enter、Backspace、Esc）；
- 颜色对比度满足 WCAG AA 要求，深色主题同样适用；
- 页面在 360px 移动端宽度至 1440px 桌面宽度下均能正常使用（响应式断点 900px）。

## 8. 提交规范

- 提交信息使用简洁的祈使句；
- 提交前在浏览器控制台确认无 JavaScript 报错、无 404 资源请求；
- 不提交编辑器配置、临时文件与本地调试代码。
