/**
 * RSSHub
 */
const RSSHub = require('rsshub')

// github trending
const getGithubTrending = async (paths) => {
    init()
    try {
        const res = await RSSHub.request('/github/trending/daily/javascript')
        return res
    } catch {
        throw new Error('RSSHub 出错')
    }
}

const init = () => {
    RSSHub.init({
        // config
    })
}

module.exports = {
    getGithubTrending
}
