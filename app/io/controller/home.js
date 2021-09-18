
module.exports = app => {
    return class Controller extends app.Controller {
        async getShellCommand () {
            const { ctx, logger, app } = this;
            const command = ctx.args[0];
            // const result = app.ssh.autoConnectExecCommand('cd /')
            ctx.socket.emit('res', { title: 'name', content: 'shhh' });
            logger.info(' ======= command ======= ', command)
            // logger.info(' ======= result ======= ', result)
        }
    }
}