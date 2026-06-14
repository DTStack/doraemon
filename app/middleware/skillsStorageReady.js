module.exports = () => {
    return async function skillsStorageReady(ctx, next) {
        await ctx.service.skills.ensureStorageReady();
        await next();
    };
};
