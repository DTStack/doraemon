
module.exports = app => {
    return class Controller extends app.Controller {
        async getMessage () {
            const { ctx, logger } = this;
            const message = ctx.args;
            ctx.socket.emit('res', { title: 'name', content: 'shhh' });
            logger.info('message ======= ', message)
        }
    }
}