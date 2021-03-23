import { createStore, combineReducers, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';
import global from './reducer';
import { API } from '@/api';

const appReducer: any = {
    global
};
const middlewares: any = [thunk.withExtraArgument({ API })];

export const create = (initalState: any) => {
    return createStore(
        combineReducers({ ...appReducer }),
        EASY_ENV_IS_DEV ? composeWithDevTools(applyMiddleware(...middlewares)) : applyMiddleware(...middlewares)
    )
};


