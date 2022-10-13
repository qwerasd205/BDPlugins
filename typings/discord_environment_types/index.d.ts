// This is here simply to make VS Code not complain.
// There's probably a better way but '\_(._.)_/'
declare class BdApi {
    constructor(id: string);
    [key: string]: any;
    [key: number]: any;

    static React: typeof React;
    static ReactDOM: typeof ReactDOM;

    Patcher: {
        after     : OptionalCaller<(module: any, func: string, callback: PatcherCallback) => CancelPatch>;
        before    : OptionalCaller<(module: any, func: string, callback: PatcherCallback) => CancelPatch>;
        instead   : OptionalCaller<(module: any, func: string, callback: PatcherCallback) => CancelPatch>;
        unpatchAll: OptionalCaller<() => void>;
    };

    Webpack: {
        [key: string]: any;
        [key: number]: any;
        getModule: (filter: FilterFn, options?: GetModuleOptions) => any;
        waitForModule: (filter: FilterFn, options?: WaitForModuleOptions) => Promise<any>;
        Filters: {
            [key: string]: any;
            [key: number]: any;
            byProps: (...props: string[]) => FilterFn;
        };
    };

    DOM: {
        addStyle   : OptionalCaller<(css: string) => void>;
        removeStyle: OptionalCaller<() => void>;
    };

    Data: {
        save  : OptionalCaller<(key: string, value: string | number | undefined) => void>;
        load  : OptionalCaller<(key: string) => string | number | undefined>;
        delete: OptionalCaller<(key: string) => void>;
    };

    UI: {
        alert: (title: string, content: string | React.ReactElement | (string | React.ReactElement)[]) => void;
        showToast: (content: string, options: {
            type?: ""|"info"|"success"|"danger"|"error"|"warning"|"warn",
            icon?: boolean,
            timeout?: number,
            forceShow?: boolean,
        }) => void;
    }
}

type PatcherCallback = (thisObject: any, args: any[], ret: any) => any;

type CancelPatch = () => void;

type FilterFn = (m: any) => boolean;

type GetModuleOptions = {
    first?        : boolean;
    searchExports?: boolean;
    defaultExport?: boolean;
}

type WaitForModuleOptions = {
    signal        : AbortSignal;
    searchExports?: boolean;
    defaultExport?: boolean;
}

type OptionalCaller<T extends (...args: any[]) => any> = T & ((id: string, ...args: Parameters<T>) => ReturnType<T>);

declare const DiscordNative: {
    [key: string]: any;
    accessibility: {
        isAccessibilitySupportEnabled: boolean;
    };
    app: {
        dock: {
            setBadge: (count: number) => void;
            bounce: () => void;
            cancelBounce: () => void;
        };
        getDefaultDoubleClickAction: () => Promise<string>;
        getModuleVersions: () => Record<string, number>;
        getReleaseChannel: () => string;
        getVersion: () => string;
        relaunch: () => void;
        setBadgeCount: (count: number) => void;
    };
    clipboard: {
        copy: (text: string) => void;
        copyImage: (image: Uint8Array) => void;
        cut: () => void;
        paste: () => void;
        read: () => string;
    };
    os: {
        arch: string;
        release: string;
    };
}