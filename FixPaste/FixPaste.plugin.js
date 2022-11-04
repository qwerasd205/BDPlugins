/**
 * @name FixPaste
 * @author Qwerasd
 * @description Fix Discord's macOS image pasting behaviour.
 * @version 0.0.1
 * @authorId 140188899585687552
 */
// utils/BdApi.ts
const { React, ReactDOM, Patcher, Webpack, Webpack: { getModule, waitForModule, Filters, Filters: { byProps } }, DOM, Data, UI } = new BdApi('FixPaste');
// utils/functional.ts
// utils/utils.ts
const SingletonListener = target => {
    const listeners = new Map();
    const clearListener = event => {
        const callback = listeners.get(event);
        if (callback) {
            // attempt to remove both the non-capture and capture version of the listener
            target.removeEventListener(event, callback);
            target.removeEventListener(event, callback, true);
            listeners.delete(event);
        }
    };
    const clearAllListeners = () => {
        for (const event of listeners.keys()) {
            clearListener(event);
        }
    };
    const setListener = (event, callback, options) => {
        clearListener(event);
        listeners.set(event, callback);
        target.addEventListener(event, callback, options);
    };
    return { setListener, clearListener, clearAllListeners };
};
// utils/modules/filters.ts
const hasSubstrings = (str, ...subs) => typeof str === 'string' && subs.every(sub => str.includes(sub));
// FixPaste/src/FixPaste.plugin.tsx
const document_listener = SingletonListener(document);
module.exports = class FixPaste {
    constructor() {
        this.cleanup = [];
    }
    start() {
        this.cleanup.push(() => DOM.removeStyle(), () => Patcher.unpatchAll(), () => document_listener.clearAllListeners());
        const assertElementModule = getModule(m => hasSubstrings(m?.[Object.keys(m)[0]]?.toString?.(), '"Unable to determine render window for element"'));
        if (assertElementModule) {
            // Discord uses this really stupid function in really stupid ways, one of which completely
            // prevents them from actually checking for the image name in the HTML paste data,
            // because they give it an element without an owner document with a window -- so we fix it for them a little.
            Patcher.instead(assertElementModule, Object.keys(assertElementModule)[0], (_, [element, type], original) => {
                if (element instanceof(typeof type === 'function' ? type : Element)) return true;
                return original(element, type);
            });
        }
        document_listener.setListener('paste', e => {
            const { clipboardData, clipboardData: { types, items } } = e;
            if (3 === types.length && 'text/plain' === types[0] && 'text/html' === types[1] && clipboardData.files.length) {
                const getGoodFileName = callback => {
                    const file = clipboardData.files[0];
                    if (file.name !== 'image.png') return callback(file.name);
                    items[1].getAsString(html => {
                        try {
                            const img = new DOMParser().parseFromString(html, 'text/html').querySelector('img');
                            if (!img) return callback('image');
                            const src_name_parts = new URL(img.src).pathname.split('/').pop().split('.');
                            src_name_parts.pop();
                            const src_name = src_name_parts.join('.');
                            if (src_name.length > 0) return callback(src_name);
                            if (img.alt) return callback(img.alt);
                            return callback('image');
                        } catch {
                            return callback('image');
                        }
                    });
                };
                const new_items = (() => {
                    const sliced_items = Array.from(items).slice(1);
                    return [sliced_items[1], Object.assign(sliced_items[0], {
                        getAsString: callback => {
                            // Help Discord find a good file name since their attempt is quite atrocious.
                            getGoodFileName(name => {
                                callback(`<img src="https://example.com/images/${name.replaceAll(/[\s~]/g, '-').replaceAll(/[/|]/g, '_').replaceAll(/[-_]{3,}/g, '_').replaceAll(/[^a-zA-Z0-9_-]/g, '')}.png">`);
                            });
                        }
                    })];
                })();
                Object.defineProperties(clipboardData, {
                    'types': {
                        value: Object.freeze(types.filter(t => t !== 'text/plain')),
                        writable: false
                    },
                    'items': {
                        value: Object.freeze(new_items),
                        writable: false
                    }
                });
            }
        }, { capture: true });
    }
    stop() {
        while (this.cleanup.length) {
            try {
                this.cleanup.pop()();
            } catch (e) {
                console.error(`Error during cleanup of FixPaste:`, e);
            }
        }
    }
};