!function(e,t){for(var r in t)e[r]=t[r]}(exports,function(e){var t={};function r(a){if(t[a])return t[a].exports;var n=t[a]={i:a,l:!1,exports:{}};return e[a].call(n.exports,n,n.exports,r),n.l=!0,n.exports}return r.m=e,r.c=t,r.d=function(e,t,a){r.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:a})},r.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},r.t=function(e,t){if(1&t&&(e=r(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var a=Object.create(null);if(r.r(a),Object.defineProperty(a,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var n in e)r.d(a,n,function(t){return e[t]}.bind(null,n));return a},r.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return r.d(t,"a",t),t},r.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},r.p="/public/",r(r.s=14)}([function(e,t){e.exports=require("react")},function(e,t){e.exports=require("react-router-dom")},function(e,t){e.exports=require("react-redux")},function(e,t){e.exports=require("antd")},function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var a=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var a in r)Object.prototype.hasOwnProperty.call(r,a)&&(e[a]=r[a])}return e};t.routerReducer=function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:c,t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=t.type,o=t.payload;if(r===n)return a({},e,{locationBeforeTransitions:o});return e};var n=t.LOCATION_CHANGE="@@router/LOCATION_CHANGE",c={locationBeforeTransitions:null}},function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var a=t.CALL_HISTORY_METHOD="@@router/CALL_HISTORY_METHOD";function n(e){return function(){for(var t=arguments.length,r=Array(t),n=0;n<t;n++)r[n]=arguments[n];return{type:a,payload:{method:e,args:r}}}}var c=t.push=n("push"),o=t.replace=n("replace"),i=t.go=n("go"),l=t.goBack=n("goBack"),s=t.goForward=n("goForward");t.routerActions={push:c,replace:o,go:i,goBack:l,goForward:s}},function(e,t){e.exports=require("react-dom")},function(e,t){e.exports=require("react-router-config")},function(e,t){e.exports=require("redux")},function(e,t){e.exports=require("react-router")},function(e,t){e.exports=require("react-hot-loader")},function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.routerMiddleware=t.routerActions=t.goForward=t.goBack=t.go=t.replace=t.push=t.CALL_HISTORY_METHOD=t.routerReducer=t.LOCATION_CHANGE=t.syncHistoryWithStore=void 0;var a=r(4);Object.defineProperty(t,"LOCATION_CHANGE",{enumerable:!0,get:function(){return a.LOCATION_CHANGE}}),Object.defineProperty(t,"routerReducer",{enumerable:!0,get:function(){return a.routerReducer}});var n=r(5);Object.defineProperty(t,"CALL_HISTORY_METHOD",{enumerable:!0,get:function(){return n.CALL_HISTORY_METHOD}}),Object.defineProperty(t,"push",{enumerable:!0,get:function(){return n.push}}),Object.defineProperty(t,"replace",{enumerable:!0,get:function(){return n.replace}}),Object.defineProperty(t,"go",{enumerable:!0,get:function(){return n.go}}),Object.defineProperty(t,"goBack",{enumerable:!0,get:function(){return n.goBack}}),Object.defineProperty(t,"goForward",{enumerable:!0,get:function(){return n.goForward}}),Object.defineProperty(t,"routerActions",{enumerable:!0,get:function(){return n.routerActions}});var c=i(r(12)),o=i(r(13));function i(e){return e&&e.__esModule?e:{default:e}}t.syncHistoryWithStore=c.default,t.routerMiddleware=o.default},function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0});var a=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var r=arguments[t];for(var a in r)Object.prototype.hasOwnProperty.call(r,a)&&(e[a]=r[a])}return e};t.default=function(e,t){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},o=r.selectLocationState,i=void 0===o?c:o,l=r.adjustUrlOnReplay,s=void 0===l||l;if(void 0===i(t.getState()))throw new Error("Expected the routing state to be available either as `state.routing` or as the custom expression you can specify as `selectLocationState` in the `syncHistoryWithStore()` options. Ensure you have added the `routerReducer` to your store's reducers via `combineReducers` or whatever method you use to isolate your reducers.");var u=void 0,m=void 0,d=void 0,p=void 0,f=void 0,g=function(e){var r=i(t.getState());return r.locationBeforeTransitions||(e?u:void 0)};if(u=g(),s){var y=function(){var t=g(!0);f!==t&&u!==t&&(m=!0,f=t,e.transitionTo(a({},t,{action:"PUSH"})),m=!1)};d=t.subscribe(y),y()}var h=function(e){m||(f=e,!u&&(u=e,g())||t.dispatch({type:n.LOCATION_CHANGE,payload:e}))};p=e.listen(h),e.getCurrentLocation&&h(e.getCurrentLocation());return a({},e,{listen:function(r){var a=g(!0),n=!1,c=t.subscribe(function(){var e=g(!0);e!==a&&(a=e,n||r(a))});return e.getCurrentLocation||r(a),function(){n=!0,c()}},unsubscribe:function(){s&&d(),p()}})};var n=r(4),c=function(e){return e.routing}},function(e,t,r){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(e){return function(){return function(t){return function(r){if(r.type!==a.CALL_HISTORY_METHOD)return t(r);var n=r.payload,c=n.method,o=n.args;e[c].apply(e,function(e){if(Array.isArray(e)){for(var t=0,r=Array(e.length);t<e.length;t++)r[t]=e[t];return r}return Array.from(e)}(o))}}}};var a=r(5)},function(e,t,r){"use strict";r.r(t);var a=r(0),n=r.n(a),c=(r(6),r(2)),o=(r(9),r(1)),i=r(7);r(10);class l extends a.Component{render(){return n.a.createElement("html",null,n.a.createElement("head",null,n.a.createElement("title",null,this.props.title),n.a.createElement("meta",{charSet:"utf-8"}),n.a.createElement("meta",{name:"viewport",content:"initial-scale=1, maximum-scale=1, user-scalable=no, minimal-ui"}),n.a.createElement("meta",{name:"keywords",content:this.props.keywords}),n.a.createElement("meta",{name:"description",content:this.props.description}),n.a.createElement("link",{rel:"shortcut icon",href:"/favicon.ico",type:"image/x-icon"})),n.a.createElement("body",null,n.a.createElement("div",{id:"app"},this.props.children)))}}const s="LIST",u="ADD",m="DEL",d=e=>(console.log("item",e),{type:u,item:e}),p=e=>({type:m,id:e});var f=Object(c.connect)(e=>({list:e.list}),{add:d,del:p})(class extends a.Component{static fetch(){return Promise.resolve({list:[{id:0,title:"Egg + React 服务端渲染模式",summary:"基于 Egg + React + Webpack 服务端渲染工程骨架项目",hits:550,url:"https://www.yuque.com/easy-team/egg-react/ssr"},{id:0,title:"Egg + React 前端渲染模式",summary:"基于Egg + React + Webpack 前端工程骨架项目",hits:550,url:"https://www.yuque.com/easy-team/egg-react/client"},{id:1,title:"前端工程化解决方案 easywebpack",summary:"programming instead of configuration, webpack is so easy",hits:550,url:"https://github.com/easy-team/easywebpack"},{id:2,title:"最强大的 Webpack CLI 工具 easywebpack-cli",summary:"easywebpack command tool, support init Vue/Reac/Weex boilerplate",hits:278,url:"https://github.com/easy-team/easywebpack-cli"}]}).then(e=>e)}render(){const{add:e,del:t,list:r}=this.props,a=r.length+1,c={id:a,title:`Egg+React 服务端渲染骨架-${a}`,summary:"基于Egg + React + Webpack3/Webpack2 服务端渲染骨架项目",hits:550+a,url:"https://github.com/easy-team/egg-react-webpack-boilerplate"};return n.a.createElement("div",{className:"redux-nav-item"},n.a.createElement("div",{className:"container"},n.a.createElement("div",{className:"row row-offcanvas row-offcanvas-right"},n.a.createElement("div",{className:"col-xs-12 col-sm-9"},n.a.createElement("ul",{className:"smart-artiles",id:"articleList"},r.map(function(e){return n.a.createElement("li",{key:e.id},n.a.createElement("div",{className:"point"},"+",e.hits),n.a.createElement("div",{className:"card"},n.a.createElement("h2",null,n.a.createElement("a",{href:e.url,target:"_blank"},e.title)),n.a.createElement("div",null,n.a.createElement("ul",{className:"actions"},n.a.createElement("li",null,n.a.createElement("time",{className:"timeago"},e.moduleName)),n.a.createElement("li",{className:"tauthor"},n.a.createElement("a",{href:"#",target:"_blank",className:"get"},"Sky")),n.a.createElement("li",null,n.a.createElement("a",null,"+收藏")),n.a.createElement("li",null,n.a.createElement("span",{className:"timeago"},e.summary)),n.a.createElement("li",null,n.a.createElement("span",{className:"redux-btn-del",onClick:()=>t(e.id)},"Delete"))))))}))))),n.a.createElement("div",{className:"redux-btn-add",onClick:()=>e(c)},"Add"))}});class g extends a.Component{render(){return n.a.createElement("h3",{className:"spa-title"},"Egg + React + Redux + React Router SPA Server Side + Webpack Render Example")}}var y=r(3);var h=class extends a.Component{constructor(e){super(e),this.state={current:"home"}}handleClick(e){console.log("click ",e,this.state),this.setState({current:e.key})}render(){return n.a.createElement("div",null,n.a.createElement(y.Menu,{onClick:this.handleClick.bind(this),selectedKeys:[this.state.current],mode:"horizontal"},n.a.createElement(y.Menu.Item,{key:"home"},n.a.createElement(o.Link,{to:"/"},"Home")),n.a.createElement(y.Menu.Item,{key:"about"},n.a.createElement(o.Link,{to:"/about"},"About"))),n.a.createElement(o.Switch,null,n.a.createElement(o.Route,{path:"/",component:f}),n.a.createElement(o.Route,{path:"/about",component:g})))}},b=r(8);r(11);function E(e,t){const r=Object.assign({},e);if(t.type===u){const e=Array.isArray(t.item)?t.item:[t.item];r.list=[...r.list,...e],console.log("-----",r.list)}else t.type===m?r.list=r.list.filter(e=>e.id!==t.id):t.type===s&&(r.list=t.list);return r}const v=e=>Object(b.createStore)(E,e);var O=[{path:"/",component:Object(c.connect)(e=>({list:e.list}),{add:d,del:p})(class extends a.Component{static fetch(){return Promise.resolve({list:[{id:0,title:"Egg + React 服务端渲染模式",summary:"基于 Egg + React + Webpack 服务端渲染工程骨架项目",hits:550,url:"https://www.yuque.com/easy-team/egg-react/ssr"},{id:0,title:"Egg + React 前端渲染模式",summary:"基于Egg + React + Webpack 前端工程骨架项目",hits:550,url:"https://www.yuque.com/easy-team/egg-react/client"},{id:1,title:"前端工程化解决方案 easywebpack",summary:"programming instead of configuration, webpack is so easy",hits:550,url:"https://github.com/easy-team/easywebpack"},{id:2,title:"最强大的 Webpack CLI 工具 easywebpack-cli",summary:"easywebpack command tool, support init Vue/Reac/Weex boilerplate",hits:278,url:"https://github.com/easy-team/easywebpack-cli"}]}).then(e=>e)}render(){const{add:e,del:t,list:r}=this.props,a=r.length+1,c={id:a,title:`Egg+React 服务端渲染骨架-${a}`,summary:"基于Egg + React + Webpack3/Webpack2 服务端渲染骨架项目",hits:550+a,url:"https://github.com/easy-team/egg-react-webpack-boilerplate"};return n.a.createElement("div",{className:"redux-nav-item"},n.a.createElement("div",{className:"container"},n.a.createElement("div",{className:"row row-offcanvas row-offcanvas-right"},n.a.createElement("div",{className:"col-xs-12 col-sm-9"},n.a.createElement("ul",{className:"smart-artiles",id:"articleList"},r.map(function(e){return n.a.createElement("li",{key:e.id},n.a.createElement("div",{className:"point"},"+",e.hits),n.a.createElement("div",{className:"card"},n.a.createElement("h2",null,n.a.createElement("a",{href:e.url,target:"_blank"},e.title)),n.a.createElement("div",null,n.a.createElement("ul",{className:"actions"},n.a.createElement("li",null,n.a.createElement("time",{className:"timeago"},e.moduleName)),n.a.createElement("li",{className:"tauthor"},n.a.createElement("a",{href:"#",target:"_blank",className:"get"},"Sky")),n.a.createElement("li",null,n.a.createElement("a",null,"+收藏")),n.a.createElement("li",null,n.a.createElement("span",{className:"timeago"},e.summary)),n.a.createElement("li",null,n.a.createElement("span",{className:"redux-btn-del",onClick:()=>t(e.id)},"Delete"))))))}))))),n.a.createElement("div",{className:"redux-btn-add",onClick:()=>e(c)},"Add"))}})},{path:"/about",component:class extends a.Component{render(){return n.a.createElement("h3",{className:"spa-title"},"Egg + React + Redux + React Router SPA Server Side + Webpack Render Example")}}},{path:"*",component:()=>React.createElement(Route,{render:({staticContext:e})=>(e&&(e.status=404),React.createElement("div",null,React.createElement("h1",null,"404 : Not Found")))})}];t.default=((e,t)=>{const r=e.state.url,a=Object(i.matchRoutes)(O,r).map(({route:e})=>{const t=e.component.fetch;return t instanceof Function?t():Promise.resolve(null)});return Promise.all(a).then(t=>{const a=e.state;t.forEach(e=>{Object.assign(a,e)}),e.state=Object.assign({},e.state,a);const i=v(a);return()=>n.a.createElement(l,null,n.a.createElement("div",null,n.a.createElement(c.Provider,{store:i},n.a.createElement(o.StaticRouter,{location:r,context:{}},n.a.createElement(h,{url:r})))))})})}]));