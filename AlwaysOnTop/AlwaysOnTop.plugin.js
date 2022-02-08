/**
 * @name AlwaysOnTop
 * @author Qwerasd
 * @description Keep the Discord window from being hidden under other windows.
 * @version 1.1.0
 * @authorId 140188899585687552
 */
Object.defineProperty(exports, "__esModule", { value: true });
const FormTitle = BdApi.findModuleByDisplayName('FormTitle'), FormText = BdApi.findModuleByDisplayName('FormText');
const setAlwaysOnTop = (v) => {
    //@ts-ignore
    window.DiscordNative.window.setAlwaysOnTop(0, v);
    BdApi.showToast(`Always on top ${v ? 'enabled' : 'disabled'}.`, { type: v ? 'success' : 'error' });
};
const isMac = process.platform === 'darwin';
const createKeybindObject = async (e) => {
    var _a, _b;
    //@ts-ignore
    const layoutMap = await navigator.keyboard.getLayoutMap();
    return {
        location: e.location,
        key: (_b = (_a = layoutMap.get(e.code)) === null || _a === void 0 ? void 0 : _a.toUpperCase()) !== null && _b !== void 0 ? _b : e.code,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
    };
};
const { useState, useRef } = BdApi.React;
const KeybindRecorder = (props) => {
    const [keybind, setKeybind] = useState(props.default);
    const [recording, setRecording] = useState(false);
    const input = useRef(null);
    const startRecording = () => {
        setRecording(true);
        input.current.focus();
    };
    const stopRecording = () => {
        setRecording(false);
        input.current.blur();
    };
    const handleKeyDown = async (e) => {
        if (['Alt', 'Shift', 'Control', 'Meta'].includes(e.key))
            return;
        if (recording) {
            const k = await createKeybindObject(e);
            setKeybind(k);
            props.onChange(k);
            stopRecording();
        }
    };
    return (BdApi.React.createElement("div", { className: `keybind-recorder ${recording ? 'recording' : ''}` },
        BdApi.React.createElement("span", { className: "keybind-recorder-control-keys" }, [
            (keybind.meta ? (isMac ? '⌘ Command' : '⊞ Win') : ''),
            (keybind.ctrl ? ('⌃ Ctrl') : ''),
            (keybind.alt ? '⌥ ' + (isMac ? 'Option' : 'Alt') : ''),
            (keybind.shift ? '⇧ Shift' : ''),
        ].filter(Boolean).map(k => k + ' + ').join('')),
        BdApi.React.createElement("span", { className: "keybind-recorder-key" }, keybind.key),
        BdApi.React.createElement("span", { className: "keybind-recorder-controls" },
            BdApi.React.createElement("button", { onClick: startRecording }, "Record"),
            BdApi.React.createElement("button", { onClick: () => { setKeybind(props.default); props.onChange(props.default); } }, "Reset")),
        BdApi.React.createElement("input", { type: "text", ref: input, onKeyDown: handleKeyDown, onBlur: stopRecording })));
};
class AlwaysOnTop {
    constructor() {
        var _a, _b;
        this.state = (_a = BdApi.loadData('AlwaysOnTop', 'state')) !== null && _a !== void 0 ? _a : true;
        this.keybind = (_b = BdApi.loadData('AlwaysOnTop', 'keybind')) !== null && _b !== void 0 ? _b : {
            location: 0,
            key: 'F11',
            ctrl: !isMac,
            meta: isMac,
            alt: false,
            shift: false,
        };
        this.boundKeyDown = this.onKeyDown.bind(this);
    }
    start() {
        if (this.state)
            setAlwaysOnTop(true);
        document.addEventListener('keydown', this.boundKeyDown);
        BdApi.injectCSS('AlwaysOnTop', /* CSS */ `
            .keybind-recorder {
                color: #fff;
                background-color: #000;
                position: relative;
                display: inline-block;
                padding: 8px;
                padding-right: 12ch;
                border-radius: 8px;
                border: 1px solid white;
            }

            .keybind-recorder.recording {
                border-color: #ff0000;
            }

            .keybind-recorder-control-keys,
            .keybind-recorder-key {
                vertical-align: text-bottom;
            }

            .keybind-recorder-controls {
                position: absolute;
                right: 8px;
            }

            .keybind-recorder-controls button:first-child {
                margin-right: 4px;
            }

            .keybind-recorder input {
                width: 0;
                border: 0;
                padding: 0;
            }
        `);
    }
    stop() {
        setAlwaysOnTop(false);
        document.removeEventListener('keydown', this.boundKeyDown);
        BdApi.clearCSS('AlwaysOnTop');
    }
    async onKeyDown(e) {
        const { key, ctrl, alt, shift, meta } = this.keybind;
        const k = await createKeybindObject(e);
        if (k.key === key && k.ctrl === ctrl && k.alt === alt && k.shift === shift && k.meta === meta) {
            this.state = !this.state;
            setAlwaysOnTop(this.state);
            BdApi.saveData('AlwaysOnTop', 'state', this.state);
        }
    }
    getSettingsPanel() {
        return BdApi.React.createElement(BdApi.React.Fragment, null,
            BdApi.React.createElement(FormTitle, null, "Keybind"),
            BdApi.React.createElement(FormText, null, "Key combo to toggle always on top functionality."),
            BdApi.React.createElement("br", null),
            BdApi.React.createElement(KeybindRecorder, { default: this.keybind, onChange: k => {
                    this.keybind = k;
                    BdApi.saveData('AlwaysOnTop', 'keybind', k);
                } }));
    }
}
exports.default = AlwaysOnTop;
