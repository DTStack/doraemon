module.exports = () => {
    return async (ctx, next) => {
        ctx.logger.info(' ======= socket connected ======= ');
        ctx.socket.emit('res', ' ======= socket connected ======= ');
        await next();
        ctx.logger.info(' ======== socket disconnection ======== ');
    };
};