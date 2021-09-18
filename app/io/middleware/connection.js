module.exports = () => {
    return async (ctx, next) => {
        ctx.logger.info(' ======= socket connected ======= ');
        ctx.socket.emit('res', ' ======= socket connected ======= ');
        ctx.socket.on('chat', (msg) => {
            ctx.logger.info(msg);
        })
        await next();
        ctx.logger.info(' ======== socket disconnection ======== ');
    };
};