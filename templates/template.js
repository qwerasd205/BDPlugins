/**
 * @name $NAME$
 * @author Qwerasd
 * @description $DESC$
 * @version 0.0.0
 * @authorId 140188899585687552
 */

import { Patcher, DOM } from 'utils/BdApi';
 
module.exports = class $NAME$ {
    /**
     * Cleanup actions will be performed in the reverse order they're added.
     * 
     * ```js
     * cleanup.push(a, b); // ... on stop: b(); a();
     * ```
     */
    cleanup = [];

    start() {
        this.cleanup.push(
            () => DOM.removeStyle(),
            () => Patcher.unpatchAll(),
        );
    }
 
    stop() {
        while (this.cleanup.length) {
            try {
                this.cleanup.pop()();
            } catch (e) {
                console.error(`Error during cleanup of $NAME$:`, e);
            }
        }
    }
 }