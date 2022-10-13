/**
 * @name PinIcon
 * @author Qwerasd
 * @description Add an icon to messages that have been pinned.
 * @version 0.1.0
 * @authorId 140188899585687552
 * @updateUrl https://betterdiscord.app/gh-redirect?id=421
 */
// utils/BdApi.ts
const { React, ReactDOM, Patcher, Webpack, Webpack: { getModule, waitForModule, Filters, Filters: { byProps } }, DOM, Data, UI } = new BdApi('PinIcon');
// utils/modules/filters.ts
const hasSubstrings = (str, ...subs) => typeof str === 'string' && subs.every(sub => str.includes(sub));
const MessageFilter = m => hasSubstrings(m.toString?.(), '"childrenSystemMessage"');
// utils/utils.ts
const getKey = (module2, f) => {
    for (const key in module2) {
        if (f(module2[key])) return key;
    }
};
// PinIcon/src/PinIcon.plugin.tsx
const MessageModule = getModule(MessageFilter, { defaultExport: false });
const Pin = getModule(m => m?.toString?.()?.includes?.('M22 12L12.101 2.10101L10.686'), { searchExports: true });
// ^^^ This is really stupid, I should just make my own pin SVG.
module.exports = class PinIcon {
    start() {
        DOM.addStyle(`
        /* Lazy fix for pin icon showing in pinned messages popout '_(•-•)_/' */
        [data-list-item-id^="pins__"] .plugin_PinIcon {
            display: none;
        }

        span.plugin_PinIcon {
            color: var(--channels-default);
            margin-inline-start: 3px;
            position: relative;
            display: inline-block;
            width: 1em; height: 1em;
        }
        
        span.plugin_PinIcon > svg {
            position: absolute;
            top: -3px;
        }`);
        const key = getKey(MessageModule, MessageFilter);
        if (!key) {
            console.error("[PinIcon] Can't find key for default in Message module...", MessageModule);
            return;
        }
        Patcher.after(MessageModule, key, (_, [props]) => {
            // catch a whole bunch of annoying things like images in the upload state and stuff like that
            if (!props.childrenMessageContent?.props?.content?.some) return;
            const isPinned = props.childrenMessageContent.props.message.pinned;
            const hasIcon = props.childrenMessageContent.props.content.some(c => c.key === 'PinIcon');
            if (isPinned && !hasIcon) {
                props.childrenMessageContent.props.content.push((() => {
                    const ref = React.useRef(null);
                    React.useEffect(() => {
                        if (ref.current == null) return;
                        UI.createTooltip(ref.current, 'Pinned', { side: 'bottom' });
                    }, []);
                    return BdApi.React.createElement('span', { className: 'plugin_PinIcon', key: 'PinIcon', ref }, BdApi.React.createElement(Pin, { width: 18 }));
                })());
            }
        });
    }
    stop() {
        Patcher.unpatchAll();
        DOM.removeStyle();
    }
};