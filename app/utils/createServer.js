const SSHClient = require('ssh2').Client;
const utf8 = require('utf8');

const createNewServer = (machineConfig, ctx) => {
    const ssh = new SSHClient();
    const { host, username, password } = machineConfig;
    const { socket } = ctx;

    // 连接成功
    ssh.on('ready', () => {
        socket.emit('serverMsg', '\r\n*** SSH CONNECTION SUCCESS ***\r\n');

        ssh.shell((err, stream) => {
            if (err) {
                return socket.send('\r\n*** SSH SHELL ERROR: ' + err.message + ' ***\r\n');
            }

            socket.on('shellCommand', (command) => {
                stream.write(command);
            });

            stream
                .on('data', (msg) => {
                    socket.emit('serverMsg', utf8.decode(msg.toString('binary')));
                })
                .on('close', () => {
                    ssh.end();
                });
        });
    })
        .on('close', () => {
            socket.emit('serverMsg', '\r\n*** SSH CONNECTION CLOSED ***\r\n');
        })
        .on('error', (err) => {
            socket.emit('serverMsg', '\r\n*** SSH CONNECTION ERROR: ' + err.message + ' ***\r\n');
        })
        .connect({
            port: 22,
            host,
            username,
            password,
        });
};

module.exports = {
    createNewServer,
};
