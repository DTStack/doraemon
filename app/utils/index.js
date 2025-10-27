const path = require('path');
const fs = require('fs');
const ROOT_PATH = path.join(__dirname, '../../');
const ChatBot = require('dingtalk-robot-sender');

const createFolder = (paths) => {
    let dirPath = ROOT_PATH;
    try {
        paths.forEach((dir) => {
            dirPath = path.join(dirPath, dir.toString());
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath);
            }
        });
        return dirPath;
    } catch {
        throw new Error('创建文件夹出错');
    }
};
const createFileSync = (paths, fileName, data) => {
    try {
        const dir = createFolder(paths);
        const filePath = path.join(dir, fileName);
        fs.writeFileSync(filePath, data);
        return filePath;
    } catch {
        throw new Error('创建文件出错');
    }
};
const sendMsg = async (webhook_url, basicInfo, operation, address) => {
    const { filename, hostIp, hostName } = basicInfo;
    const feChatRobot = new ChatBot({
        webhook: webhook_url,
    });
    const mdTxt =
        'Doraemon - 配置中心变更通知：\n\n\n' +
        '文件名：' +
        filename +
        '\n\n\n' +
        '主机：' +
        hostIp +
        '(' +
        hostName +
        ')\n\n' +
        '详情地址：' +
        address +
        '\n\n\n' +
        '该配置文件' +
        operation;
    feChatRobot.markdown('配置中心变更通知', mdTxt).catch((ex) => console.error(ex));
};
const sendHostsUpdateMsg = async (webhook_url, basicInfo, ip, address, operation) => {
    const { groupName, groupApi } = basicInfo;
    const feChatRobot = new ChatBot({
        webhook: webhook_url,
    });
    const mdTxt =
        'Doraemon - Hosts管理变更通知：\n\n\n' +
        '分组名称：' +
        groupName +
        '\n\n\n' +
        'API：' +
        ip +
        groupApi +
        '\n\n\n' +
        '详情地址：' +
        address +
        '\n\n\n' +
        '该Hosts文件' +
        operation;
    feChatRobot.markdown('Hosts管理变更通知', mdTxt).catch((ex) => console.error(ex));
};

// 发送文章订阅消息
const sendArticleMsg = async (title, text, webhook, at = {}) => {
    const feChatRobot = new ChatBot({ webhook });
    feChatRobot.markdown(title, text, at).catch((ex) => console.error(ex));
};

// 文章订阅发送后，发出是否成功的通知
const sendMsgAfterSendArticle = async (title, text, webhook) => {
    const feChatRobot = new ChatBot({ webhook });
    feChatRobot.markdown(title, text).catch((ex) => console.error(ex));
};

/**
 * 将驼峰命名转换为下划线命名
 * @param {string} str - 驼峰命名的字符串
 * @returns {string} 下划线命名的字符串
 */
const camelToSnake = (str) => {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

/**
 * 将对象的驼峰命名键转换为下划线命名
 * @param {Object} obj - 需要转换的对象
 * @param {Array} excludeKeys - 需要排除不转换的键名数组
 * @returns {Object} 转换后的对象
 */
const convertKeysToSnakeCase = (obj, excludeKeys = []) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return obj;
    }

    const result = {};
    Object.keys(obj).forEach((key) => {
        if (excludeKeys.includes(key)) {
            result[key] = obj[key];
        } else {
            const snakeKey = camelToSnake(key);
            result[snakeKey] = obj[key];
        }
    });

    return result;
};

/**
 * 构建MCP配置对象
 * @param {Object} server - 数据库中的MCP配置记录
 * @returns {Object} MCP服务配置对象
 */
const buildMCPConfig = (server) => {
    const config = {
        transport: {
            type: server.transport,
        },
    };

    if (server.transport === 'stdio') {
        config.command = server.command;
        config.args = server.args || [];
        config.env = server.env || {};
        config.cwd = server.deploy_path; // 设置工作目录为部署路径
    } else if (server.transport === 'streamable-http') {
        config.httpUrl = server.http_url;
    } else if (server.transport === 'sse') {
        config.sseUrl = server.sse_url;
    }

    return config;
};

module.exports = {
    createFolder,
    createFileSync,
    sendMsg,
    sendHostsUpdateMsg,
    sendArticleMsg,
    sendMsgAfterSendArticle,
    camelToSnake,
    convertKeysToSnakeCase,
    buildMCPConfig,
    response: (success, data = null, message) => {
        if (success) {
            message = '执行成功';
        }
        return {
            success,
            data,
            message,
        };
    },
};
