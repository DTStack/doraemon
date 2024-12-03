declare var EASY_ENV_IS_NODE: boolean;
declare var EASY_ENV_IS_DEV: boolean;
declare var EASY_ENV_IS_BROWSER: boolean;
declare var process: {
  env: {
    NODE_ENV: string
  }
};
interface Window {
  __INITIAL_STATE__: any;
  stores: any;
}

declare module '*.png' {
  const value: string;
  export default value;
}
declare module '*.svg' {
  const value: string;
  export default value;
}
