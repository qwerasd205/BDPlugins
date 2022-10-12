
import { Debouncer } from "utils/utils";

import { waitForModule, DOM } from "utils/BdApi";

export const makeSelector = (class_name: string) => '.' + class_name?.split(' ').join('.');

export const asyncCSS = (
        id: string,
        signal: AbortSignal,
        template: (selectors: Record<string, string>) => string,
        classname_modules: [string[]|Record<string,string>, (m: any) => boolean][]
    ) => {
        const debounce = Debouncer(0);

        const discovered: Record<string, string> = {};

        const updateCSS = () => DOM.addStyle(template(discovered));

        for (const [keys, filter] of classname_modules) {
            const map = new Map<string, string>(
                Array.isArray(keys)
                    ? keys.map(k => [k, k])
                    : Object.entries(keys)
            );

            for (const name of map.values()) {
                discovered[name] = '#Q_AWAITING_SELECTOR';
            }

            (async () => {
                const m = await waitForModule(filter, { signal });
                if (!m) return;
                for (const k of map.keys()) {
                    const name = map.get(k);
                    if (k in m && typeof m[k] === 'string') {
                        discovered[name] = makeSelector(m[k]);
                    }
                }
                debounce(updateCSS);
            })();
        }

        debounce(updateCSS);

        signal.addEventListener('abort', () => {
            DOM.removeStyle();
            debounce(() => {});
        });
    }