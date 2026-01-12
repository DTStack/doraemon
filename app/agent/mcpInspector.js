const ip = require('ip');
const { spawn } = require('child_process');
const env = require('../../env.json');

const { mcpInspectorWebPort, mcpInspectorServerPort, mcpInspectorDomainWhiteList } = env;

const startMcpInspector = (agent) => {
    const localIP = ip.address();
    const domainWhiteList = [];
    [9000, 9001, 9002, mcpInspectorWebPort].forEach((port) => {
        domainWhiteList.push(`http://localhost:${port}`);
        domainWhiteList.push(`http://127.0.0.1:${port}`);
        domainWhiteList.push(`http://${localIP}:${port}`);
        domainWhiteList.push(...mcpInspectorDomainWhiteList.map((domain) => `${domain}:${port}`));
    });

    const child = spawn(
        'npx',
        [
            // 如果fetch failed, 可以尝试切换到国内镜像
            '--registry=https://registry.npmjs.org',
            '-y',
            '@modelcontextprotocol/inspector@0.18.0',
        ],
        {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: process.cwd(),
            env: {
                ...process.env,
                CLIENT_PORT: mcpInspectorWebPort,
                SERVER_PORT: mcpInspectorServerPort,
                MCP_AUTO_OPEN_ENABLED: false,
                HOST: '0.0.0.0',
                DANGEROUSLY_OMIT_AUTH: true,
                ALLOWED_ORIGINS: domainWhiteList.join(','),
            },
        }
    );

    agent.logger.info('\n *** MCP INSPECTOR STARTED ***');

    child.stdout.on('data', (data) => {
        agent.logger.info('\n *** MCP INSPECTOR STDOUT ***', data.toString());
    });

    child.stderr.on('data', (data) => {
        agent.logger.info('\n *** MCP INSPECTOR STDERR ***', data.toString());
    });

    child.on('close', (code) => {
        agent.logger.error('\n *** MCP INSPECTOR CLOSED ***', code);
    });

    child.on('error', (error) => {
        agent.logger.error('\n *** MCP INSPECTOR ERROR ***', error);
    });

    return child;
};

module.exports = {
    startMcpInspector,
};
