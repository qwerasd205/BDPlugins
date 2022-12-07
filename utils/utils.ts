
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
        ? flip(curry(setTimeout, 2))(delay)
        : requestAnimationFrame;

    const cancel = delay
        ? () => clearTimeout(t as NodeJS.Timeout)
        : () => cancelAnimationFrame(t as number);

    return (f: Fn, ...args: any[]) => {
        cancel();
        t = issue(() => f(...args));
    }
}

export const AnimationFrameDebouncer = () => {
    let t: number;

    return (f: Fn, ...args: any[]) => {
        cancelAnimationFrame(t);
        t = requestAnimationFrame(() => f(...args));
    }
}

export const SingletonListener = <T extends EventTarget>(target: T) => {
    type EventTypesForTarget = Parameters< T['addEventListener']>[0];
    const listeners = new Map<EventTypesForTarget, EventListenerOrEventListenerObject>();
    const clearListener = (event: EventTypesForTarget) => {
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
    const setListener = ((event, callback, options?) => {
        clearListener(event);
        listeners.set(event, callback);
        target.addEventListener(event, callback, options);
    }) as T['addEventListener'];
    return {
        setListener,
        clearListener,
        clearAllListeners,
    }
}

export const getKey = (module: any, f: FilterFn): string | undefined => {
    for (const key in module) {
        if (f(module[key])) return key;
    }
}

export const findKey = (object: any, f: FilterFn): string | undefined => {
    for (const key in object) {
        if (f(key)) return key;
    }
}

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);