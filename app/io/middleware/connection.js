module.exports = () => {
    return async (ctx, next) => {
        ctx.logger.info('*** SOCKET IO CONNECTION SUCCESS ***');
        ctx.socket.emit('serverMsg', '\r\n*** SOCKET IO CONNECTION SUCCESS ***\r\n')
        await next();
        ctx.logger.info('*** SOCKET IO DISCONNECTION ***');
        ctx.socket.emit('serverMsg', '\r\n*** SOCKET IO DISCONNECTION ***\r\n')
    };
};