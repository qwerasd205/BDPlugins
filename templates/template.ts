/**
 * @name $NAME$
 * @author Qwerasd
 * @description $DESC$
 * @version 0.0.0
 * @authorId 140188899585687552
 */

const PLUGIN_NAME = '$NAME$';

const { Patcher, Webpack, Webpack: { Filters } } = BdApi;
 
export = class $NAME$ {
    start() {
        BdApi.injectCSS(PLUGIN_NAME, /*CSS*/`

        `);
    }

    stop() {
        BdApi.clearCSS(PLUGIN_NAME);
        Patcher.unpatchAll(PLUGIN_NAME);
    }
}