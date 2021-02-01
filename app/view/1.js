exports.ids = [1];
exports.modules = {

/***/ "./app/web/pages/webTerminal/index.js":
/*!********************************************!*\
  !*** ./app/web/pages/webTerminal/index.js ***!
  \********************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _components_loading__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/components/loading */ \"./app/web/components/loading/index.js\");\n/* harmony import */ var _style_scss__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./style.scss */ \"./app/web/pages/webTerminal/style.scss\");\n/* harmony import */ var _style_scss__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_style_scss__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var xterm__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! xterm */ \"./node_modules/xterm/lib/xterm.js\");\n/* harmony import */ var xterm__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(xterm__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var xterm_css_xterm_css__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! xterm/css/xterm.css */ \"./node_modules/xterm/css/xterm.css\");\n/* harmony import */ var xterm_css_xterm_css__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(xterm_css_xterm_css__WEBPACK_IMPORTED_MODULE_4__);\n\n\n\n\n\nconst Toolbox = () => {\n  const [loading, setLoading] = Object(react__WEBPACK_IMPORTED_MODULE_0__[\"useState\"])(false);\n  const initTerm = () => {\n    let term = new xterm__WEBPACK_IMPORTED_MODULE_3__[\"Terminal\"]({\n      cols: 100,\n      rows: 20,\n      cursorBlink: 5,\n      scrollback: 30,\n      tabStopWidth: 4,\n      theme: {\n        foreground: '#5FFDFF',\n        background: '#060101'\n      }\n    });\n    let terminalContainer = document.getElementById('terminal-container');\n    term.open(terminalContainer);\n    term.focus();\n    term.prompt = () => {\n      term.write(' ~ ');\n    };\n\n    if ('WebSocket' in window) {\n      term.writeln('\\x1b[1;1;32mThe Browser supports websocket!\\x1b[0m');\n      term.prompt();\n    } else {\n      term.writeln('\\x1b[1;1;31mThe Browser does not support websocket!\\x1b[0m');\n    }\n    term.textarea.onkeydown = function (e) {\n      console.log('User pressed key with keyCode: ', e.keyCode);\n    };\n\n    return term;\n  };\n  Object(react__WEBPACK_IMPORTED_MODULE_0__[\"useEffect\"])(() => {\n    initTerm();\n  }, []);\n  return react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(\n    _components_loading__WEBPACK_IMPORTED_MODULE_1__[\"default\"],\n    { loading: loading },\n    react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement(\n      'div',\n      { className: 'page-toolbox' },\n      'web terminal',\n      react__WEBPACK_IMPORTED_MODULE_0___default.a.createElement('div', { id: 'terminal-container' })\n    )\n  );\n};\n/* harmony default export */ __webpack_exports__[\"default\"] = (Toolbox);\n\n//# sourceURL=webpack:///./app/web/pages/webTerminal/index.js?");

/***/ }),

/***/ "./app/web/pages/webTerminal/style.scss":
/*!**********************************************!*\
  !*** ./app/web/pages/webTerminal/style.scss ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("\n    var content = __webpack_require__(/*! !../../../../node_modules/css-loader??ref--6-1!../../../../node_modules/postcss-loader/lib??postcss!../../../../node_modules/sass-loader/dist/cjs.js??ref--6-3!./style.scss */ \"./node_modules/css-loader/index.js?!./node_modules/postcss-loader/lib/index.js?!./node_modules/sass-loader/dist/cjs.js?!./app/web/pages/webTerminal/style.scss\");\n    var insertCss = __webpack_require__(/*! ../../../../node_modules/isomorphic-style-loader/lib/insertCss.js */ \"./node_modules/isomorphic-style-loader/lib/insertCss.js\");\n\n    if (typeof content === 'string') {\n      content = [[module.i, content, '']];\n    }\n\n    module.exports = content.locals || {};\n    module.exports._getContent = function() { return content; };\n    module.exports._getCss = function() { return content.toString(); };\n    module.exports._insertCss = function(options) { return insertCss(content, options) };\n    \n    // Hot Module Replacement\n    // https://webpack.github.io/docs/hot-module-replacement\n    // Only activated in browser context\n    if (false) { var removeCss; }\n  \n\n//# sourceURL=webpack:///./app/web/pages/webTerminal/style.scss?");

/***/ }),

/***/ "./node_modules/css-loader/index.js?!./node_modules/postcss-loader/lib/index.js?!./node_modules/sass-loader/dist/cjs.js?!./app/web/pages/webTerminal/style.scss":
/*!******************************************************************************************************************************************************************************!*\
  !*** ./node_modules/css-loader??ref--6-1!./node_modules/postcss-loader/lib??postcss!./node_modules/sass-loader/dist/cjs.js??ref--6-3!./app/web/pages/webTerminal/style.scss ***!
  \******************************************************************************************************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("exports = module.exports = __webpack_require__(/*! ../../../../node_modules/css-loader/lib/css-base.js */ \"./node_modules/css-loader/lib/css-base.js\")(undefined);\n// imports\n\n\n// module\nexports.push([module.i, \"\", \"\"]);\n\n// exports\n\n\n//# sourceURL=webpack:///./app/web/pages/webTerminal/style.scss?./node_modules/css-loader??ref--6-1!./node_modules/postcss-loader/lib??postcss!./node_modules/sass-loader/dist/cjs.js??ref--6-3");

/***/ })

};;