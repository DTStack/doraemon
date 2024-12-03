const { createNewServer } = require('../../utils/createServer');

module.exports = (app) => {
    return class Controller extends app.Controller {
        // async getShellCommand () {
        //     const { ctx, logger, app } = this;
        //     const command = ctx.args[0];
        //     ctx.socket.emit('res', { code: 1, content: 'Message received' });
        //     logger.info(' ======= command ======= ', command)
        // }

        async loginServer() {
            const { ctx } = this;
            const { host, username, password } = ctx.args[0];

            createNewServer(
                {
                    host,
                    username,
                    password,
                },
                ctx
            );
        }
    };
};
