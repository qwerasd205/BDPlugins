/**
 * @name $NAME$
 * @author Qwerasd
 * @description $DESC$
 * @version 0.0.0
 * @authorId 140188899585687552
 */

export default class $NAME$ {
    start() {
        BdApi.injectCSS('$NAME$', /*CSS*/`

        `);
    }

    stop() {
        BdApi.clearCSS('$NAME$');
        BdApi.Patcher.unpatchAll('$NAME$');
    }
}
