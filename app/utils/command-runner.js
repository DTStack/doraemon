const { spawn } = require('child_process');

const DEFAULT_TIMEOUT_MS = 120 * 1000;

class CommandRunner {
    constructor({ defaultTimeout = DEFAULT_TIMEOUT_MS } = {}) {
        this.defaultTimeout = defaultTimeout;
    }

    runCommand(command, args = [], timeout = this.defaultTimeout, cwd = process.cwd(), env = process.env) {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, {
                cwd,
                env,
            });

            let stdout = '';
            let stderr = '';
            let timedOut = false;

            const timer = setTimeout(() => {
                timedOut = true;
                child.kill('SIGTERM');
            }, timeout);

            child.stdout.on('data', (chunk) => {
                stdout += chunk.toString();
            });

            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });

            child.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });

            child.on('close', (code) => {
                clearTimeout(timer);

                if (timedOut) {
                    reject(new Error(`命令执行超时（${timeout}ms）: ${command}`));
                    return;
                }

                if (code !== 0) {
                    const detail = this.trimCommandOutput(stderr || stdout);
                    reject(new Error(detail || `命令退出码: ${code}`));
                    return;
                }

                resolve({ stdout, stderr });
            });
        });
    }

    trimCommandOutput(content = '') {
        const value = String(content || '').trim();
        if (!value) return '';
        const maxLength = 3000;
        if (value.length <= maxLength) return value;
        return value.slice(value.length - maxLength);
    }
}

module.exports = CommandRunner;
