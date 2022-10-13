
const {
    React,
    ReactDOM,
    Patcher,
    Webpack, Webpack: {
        getModule,
        waitForModule,
        Filters, Filters: {
            byProps
        }
    },
    DOM,
    Data,
    UI,
} = new BdApi(PLUGIN_NAME);

export {
    React,
    ReactDOM,
    Patcher,
    Webpack,
        getModule,
        waitForModule,
        Filters,
            byProps,
    DOM,
    Data,
    UI,
}