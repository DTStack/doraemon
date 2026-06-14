module.exports = () => {
    let storageReadyPromise = null;

    return async function skillsStorageReady(ctx, next) {
        if (!storageReadyPromise) {
            storageReadyPromise = ctx.service.skills.ensureStorageReady().catch(error => {
                storageReadyPromise = null;
                throw error;
            });
        }
        await storageReadyPromise;
        await next();
    };
};
