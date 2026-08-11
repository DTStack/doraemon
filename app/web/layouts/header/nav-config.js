'use strict';

const MORE_MENU_PATH = '/page/more';

const NAV_MENU_LIST = [
    {
        name: '应用中心',
        path: '/page/toolbox',
        iconKey: 'appstore',
        routers: ['toolbox', 'switch-hosts-list', 'switch-hosts-edit', 'article-subscription-list'],
    },
    {
        name: '代理服务',
        path: '/page/proxy-server',
        iconKey: 'cloud',
        routers: ['proxy-server'],
    },
    {
        name: 'MCP',
        path: '/page/mcp-server-market',
        iconKey: 'ungroup',
        routers: [
            'mcp-server-market',
            'mcp-server-registry',
            'mcp-server-management',
            'mcp-server-detail',
            'mcp-server-inspector',
        ],
    },
    {
        name: 'Skills',
        path: '/page/skills',
        iconKey: 'book',
        routers: ['skills'],
    },
    {
        name: 'Agents',
        path: '/page/agents',
        iconKey: 'robot',
        routers: ['agents'],
    },
    {
        name: '更多',
        path: MORE_MENU_PATH,
        iconKey: 'more',
        routers: ['host-management', 'env-management', 'config-center', 'config-detail', 'tags'],
        children: [
            {
                name: '主机管理',
                path: '/page/host-management',
                iconKey: 'cloud-server',
                routers: ['host-management'],
            },
            {
                name: '环境管理',
                path: '/page/env-management',
                iconKey: 'desktop',
                routers: ['env-management'],
            },
            {
                name: '配置中心',
                path: '/page/config-center',
                iconKey: 'setting',
                routers: ['config-center', 'config-detail'],
            },
            {
                name: '标签管理',
                path: '/page/tags',
                iconKey: 'tag',
                routers: ['tags'],
            },
        ],
    },
];

function getActiveNavPath(pathname, navMenuList = NAV_MENU_LIST) {
    const targetPathname = String(pathname || '');
    const current = navMenuList.find((item) =>
        (item.routers || []).some((router) => targetPathname.indexOf(router) > -1)
    );

    return current ? current.path : '';
}

function findMatchedMenu(pathname, navMenuList = NAV_MENU_LIST) {
    const targetPathname = String(pathname || '');

    for (const item of navMenuList) {
        const directMatched = (item.routers || []).some((router) => targetPathname.indexOf(router) > -1);
        if (directMatched && !Array.isArray(item.children)) {
            return {
                selectedPath: item.path,
                openPath: '',
            };
        }

        if (Array.isArray(item.children)) {
            const childMatched = item.children.find((child) =>
                (child.routers || []).some((router) => targetPathname.indexOf(router) > -1)
            );
            if (childMatched) {
                return {
                    selectedPath: childMatched.path,
                    openPath: item.path,
                };
            }
        }
    }

    return {
        selectedPath: '',
        openPath: '',
    };
}

function getMenuState(pathname, navMenuList = NAV_MENU_LIST) {
    const matched = findMatchedMenu(pathname, navMenuList);
    return {
        selectedKeys: matched.selectedPath ? [matched.selectedPath] : [],
        openKeys: matched.openPath ? [matched.openPath] : [],
    };
}

function resolveMenuClickKey(event) {
    const safeEvent = event || {};
    const keyPath = Array.isArray(safeEvent.keyPath) ? safeEvent.keyPath : [];
    return keyPath.length > 1 ? keyPath[keyPath.length - 1] : String(safeEvent.key || '');
}

module.exports = {
    MORE_MENU_PATH,
    NAV_MENU_LIST,
    getMenuState,
    getActiveNavPath,
    resolveMenuClickKey,
};
