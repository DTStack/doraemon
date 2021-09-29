/**
 * RSSHub
 */
const RSSHub = require('rsshub')
const axios = require('axios')

const init = () => {
    RSSHub.init({
        // config
    })
}

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

// 掘金热门
const getJueJinHot = async (paths) => {
    return new Promise((resolve, reject) => {
        axios.post('https://api.juejin.cn/recommend_api/v1/article/recommend_cate_feed', { cate_id: '6809637767543259144' }).then(({ data = {} }) => {
            resolve(data.data)
        }).catch((err) => {
            reject(err)
        })
    })
}

module.exports = {
    getGithubTrending,
    getJueJinHot
}
