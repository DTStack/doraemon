const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const {
    NAV_MENU_LIST,
    getActiveNavPath,
    getMenuState,
    resolveMenuClickKey,
    MORE_MENU_PATH,
} = require('../app/web/layouts/header/nav-config');

test('主机管理等四个低频入口被收纳到更多菜单', () => {
    const moreMenu = NAV_MENU_LIST.find((item) => item.path === MORE_MENU_PATH);

    assert.ok(moreMenu);
    assert.equal(moreMenu.children.length, 3);
    assert.deepEqual(
        moreMenu.children.map((item) => item.path),
        ['/page/host-management', '/page/config-center', '/page/tags']
    );
});

test('命中更多菜单子路由时高亮更多', () => {
    assert.equal(getActiveNavPath('/page/host-management/detail', NAV_MENU_LIST), MORE_MENU_PATH);
    assert.equal(getActiveNavPath('/page/config-detail/12', NAV_MENU_LIST), MORE_MENU_PATH);
});

test('环境管理提升为一级导航后直接高亮自身', () => {
    assert.equal(getActiveNavPath('/page/env-management', NAV_MENU_LIST), '/page/env-management');
    assert.deepEqual(getMenuState('/page/env-management', NAV_MENU_LIST), {
        selectedKeys: ['/page/env-management'],
        openKeys: [],
    });
});

test('命中更多菜单子路由时，selectedKeys 选中子项，openKeys 展开更多', () => {
    assert.deepEqual(getMenuState('/page/host-management/detail', NAV_MENU_LIST), {
        selectedKeys: ['/page/host-management'],
        openKeys: [MORE_MENU_PATH],
    });
    assert.deepEqual(getMenuState('/page/config-detail/12', NAV_MENU_LIST), {
        selectedKeys: ['/page/config-center'],
        openKeys: [MORE_MENU_PATH],
    });
});

test('子菜单点击时使用顶层更多菜单作为选中项', () => {
    assert.equal(
        resolveMenuClickKey({ key: '/page/tags', keyPath: ['/page/tags', MORE_MENU_PATH] }),
        MORE_MENU_PATH
    );
    assert.equal(
        resolveMenuClickKey({ key: '/page/agents', keyPath: ['/page/agents'] }),
        '/page/agents'
    );
});

test('导航配置不使用可选链语法，兼容当前前端构建链', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/layouts/header/nav-config.js'),
        'utf8'
    );

    assert.equal(content.includes('?.'), false, 'nav-config.js 不能使用 optional chaining 语法');
});

test('顶栏样式覆盖更多标题的 hover 和展开颜色', () => {
    const content = fs.readFileSync(
        path.join(__dirname, '../app/web/layouts/header/style.scss'),
        'utf8'
    );

    assert.equal(
        content.includes('.ant-menu-submenu-title:hover'),
        true,
        'header style 需要显式覆盖更多标题 hover 样式'
    );
    assert.equal(
        content.includes('&.ant-menu-submenu-open > .ant-menu-submenu-title'),
        true,
        'header style 需要显式覆盖更多标题展开样式'
    );
    assert.equal(
        content.includes('color: #3F87FF'),
        true,
        'header style 需要把更多标题 hover 和展开文字设为蓝色'
    );
});
