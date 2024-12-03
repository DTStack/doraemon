// 订阅记录的状态 1 开启 2 关闭
export enum SUBSCRIPTIONSTATUS {
    OPEN = 1,
    CLOSE = 2,
}

// 订阅的推送时间方式 1 周一至周五 2 每天
export enum SUBSCRIPTIONSENDTYPE {
    FRIDAY = 0,
    WORKDAY = 1,
    EVERYDAY = 2,
    MONDAY = 3,
}

// 订阅的推送时间方式 1 周一至周五 2 每天
export const SUBSCRIPTIONSENDTYPECN = {
    [SUBSCRIPTIONSENDTYPE.MONDAY]: '每周一',
    [SUBSCRIPTIONSENDTYPE.FRIDAY]: '每周五',
    [SUBSCRIPTIONSENDTYPE.WORKDAY]: '周一至周五',
    [SUBSCRIPTIONSENDTYPE.EVERYDAY]: '每天',
};
