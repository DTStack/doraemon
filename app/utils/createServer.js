const SSHClient = require('ssh2').Client;
const utf8 = require('utf8');


export const createNewServer = (machineConfig, socket) => {
  const ssh = new SSHClient();
  const { host, username, password } = machineConfig;
  // 连接成功
  ssh.on('ready', function () {

    socket.send('\r\n*** SSH CONNECTION SUCCESS ***\r\n');

    ssh.shell(function (err, stream) {
      // 出错
      if (err) {
        return socket.send('\r\n*** SSH SHELL ERROR: ' + err.message + ' ***\r\n');
      }

      // 前端发送消息
      socket.on('message', function (data) {
        stream.write(data);
      });

      // 通过sh发送消息给前端
      stream.on('data', function (d) {
        socket.send(utf8.decode(d.toString('binary')));

        // 关闭连接
      }).on('close', function () {
        ssh.end();
      });
    })

    // 关闭连接
  }).on('close', function () {
    socket.send('\r\n*** SSH CONNECTION CLOSED ***\r\n');

    // 连接错误
  }).on('error', function (err) {
    socket.send('\r\n*** SSH CONNECTION ERROR: ' + err.message + ' ***\r\n');

    // 连接
  }).connect({
    port: 22,
    host,
    username,
    password
  });
}
