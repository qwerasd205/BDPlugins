
import type { Fn } from 'utils/functional';

import { curry, flip } from 'utils/functional';

type ObjKey = string | number | symbol;

export const walkTree = <T extends {}>(
    elem: T,
    filter: (o: any) => boolean,
    keys: ObjKey[] = ['child', 'alternate', 'sibling', 'return'],
    seen = new WeakSet<object>()
): any => {
    if (elem == null) return false;
    if (seen.has(elem)) return false;

    if (filter(elem)) return elem;

    seen.add(elem);

    for (const key of keys) {
        if (elem[key] != null) {
            const res = walkTree(elem[key], filter, keys, seen);
            if (res) return res;
        }
    }

    return false;
};

export const Debouncer = (delay: number) => {
    let t: number | NodeJS.Timeout;

    const issue = delay
        ? flip(curry(setTimeout))(delay)
        : requestAnimationFrame;

    const cancel = delay
        ? () => clearTimeout(t as NodeJS.Timeout)
        : () => cancelAnimationFrame(t as number);

    return (f: Fn, ...args: any[]) => {
        cancel();
        t = issue(() => f(...args));
    }
}

export const getKey = (module: any, f: FilterFn): string | undefined => {
    for (const key in module) {
        if (f(module[key])) return key;
    }
}