/**
 * @name AlwaysOnTop
 * @author Qwerasd
 * @description Keep the Discord window from being hidden under other windows.
 * @version 1.2.2
 * @authorId 140188899585687552
 * @updateUrl https://betterdiscord.app/gh-redirect?id=611
 */

import { React, getModule, byProps, Data, DOM, UI } from 'utils/BdApi';

const FormTitle: React.ComponentClass
    = getModule(byProps('Tags', 'Sizes'));
const FormText: React.ComponentClass
    = getModule(m => m?.Sizes?.SIZE_32 && m.Colors);
const FormDivider: React.ComponentClass
    = getModule(m => m?.toString?.()?.includes?.('().divider'));
const SwitchItem: React.FunctionComponent<
        {onChange: Function, note: string, value: boolean}
    > = getModule(m => m?.toString?.()?.includes?.("helpdeskArticleId"));

const Switch: React.FunctionComponent<{onChange: Function, defaultValue: boolean, note: string}>
    = ({onChange, defaultValue, note, children}) => {
        const [value, setValue] = React.useState(defaultValue);
        const onChangeFunc = (newValue) => {
            onChange(newValue);
            setValue(newValue);
        };
        return <SwitchItem onChange={onChangeFunc} note={note} value={value} children={children}/>;
    };

const setAlwaysOnTop = (v: boolean): void => {
    //@ts-ignore
    window.DiscordNative.window.setAlwaysOnTop(0, v);
    UI.showToast(`Always on top ${v ? 'enabled' : 'disabled'}.`, {type: v ? 'success' : 'error'});
}

const isMac = process.platform === 'darwin';

interface Keybind {
    location: number;
    key: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
    keyName: string;
}

const createKeybindObject = async (e: KeyboardEvent): Promise<Keybind> => {
    //@ts-ignore
    const layoutMap = await navigator.keyboard.getLayoutMap();
    return {
        location: e.location,
        key: e.code,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
        keyName: layoutMap.get(e.code)?.toUpperCase() ?? e.code,
    };
}

const { useState, useRef } = React;

const KeybindRecorder: React.FunctionComponent<{ default: Keybind, onChange: (k: Keybind) => void }> = (props) => {
    const [keybind, setKeybind] = useState(props.default);
    const [recording, setRecording] = useState(false);

    const input = useRef(null);

    const startRecording = (): void => {
        setRecording(true);
        input.current.focus();
    }

    const stopRecording = (): void => {
        setRecording(false);
        input.current.blur();
    }

    const handleKeyDown = async (e): Promise<void> => {
        if (['Alt', 'Shift', 'Control', 'Meta'].includes(e.key)) return;
        if (recording) {
            const k = await createKeybindObject(e);
            setKeybind(k);
            props.onChange(k);
            stopRecording();
        }
    }

    //@ts-ignore
    navigator.keyboard.getLayoutMap().then((layoutMap) => {
        const newKeyName = layoutMap.get(keybind.key)?.toUpperCase() ?? keybind.key;
        if (newKeyName !== keybind.keyName) {
            setKeybind({...keybind, keyName: newKeyName});
        }
    });

    if (recording) input.current.focus(); // if for some reason the component re-renders in the middle of recording, focus the input again

    return (
        <div className={`keybind-recorder ${recording ? 'recording' : ''}`}>
            <span className="keybind-recorder-control-keys">{
                [
                    (keybind.meta  ? (isMac ? '⌘ Command' : '⊞ Win') : ''),
                    (keybind.ctrl  ? ('⌃ Ctrl') : ''),
                    (keybind.alt   ? (isMac ? '⌥ Option' : '⎇ Alt') : ''),
                    (keybind.shift ? '⇧ Shift' : ''),
                ].filter(Boolean).map(k => k + ' + ').join('')
            }</span>
            <span className="keybind-recorder-key">{keybind.keyName}</span>
            <span className="keybind-recorder-controls">
                <button onClick={startRecording}>Record</button>
                <button onClick={() => {setKeybind(props.default); props.onChange(props.default)}}>Reset</button>
            </span>
            <input type="text" ref={input} onKeyDown={handleKeyDown} onBlur={stopRecording} />
        </div>
    )
}

// Check the window is within 4 px of filling available space
// because sometimes "maximized" windows don't actually fill all space -_-
const isMaximized = () => 
    window.screen.availWidth - window.outerWidth < 4
    && window.screen.availHeight - window.outerHeight < 4;

export = class AlwaysOnTop {
    state: boolean = Data.load('state') ?? true;

    keybind: Keybind = Data.load('keybind') ?? {
        location: 0,
        key: 'F11',
        keyName: 'F11',
        ctrl: !isMac,
        meta: isMac,
        alt: false,
        shift: false,
    };

    boundKeyDown = this.onKeyDown.bind(this);
    boundResize = this.onResize.bind(this);

    disableWhenMaximized = Data.load('disableWhenMaximized') ?? false;

    disabledByMaximization = false;

    start() {
        if (this.disableWhenMaximized && isMaximized()) {
            this.disabledByMaximization = this.state;
        } else if (this.state) {
            setAlwaysOnTop(true);
        }
        document.addEventListener('keydown', this.boundKeyDown);
        window.addEventListener('resize', this.boundResize);
        DOM.addStyle(/* CSS */`
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
        window.removeEventListener('resize', this.boundResize);
        DOM.removeStyle();
    }

    onResize () {
        if (!this.state || !this.disableWhenMaximized) return;
        if (isMaximized()) {
            setAlwaysOnTop(false);
            this.disabledByMaximization = true;
        } else if (this.disabledByMaximization) {
            setAlwaysOnTop(true);
            this.disabledByMaximization = false;
        }
    }

    async onKeyDown (e: KeyboardEvent) {
        const { key, ctrl, alt, shift, meta } = this.keybind;
        const k = await createKeybindObject(e);
        if (k.key === key && k.ctrl === ctrl && k.alt === alt && k.shift === shift && k.meta === meta) {
            this.state = !this.state;
            setAlwaysOnTop(this.state);
            Data.save('state', this.state);
        }
    }

    getSettingsPanel () {
        return <>
            <FormTitle>Keybind</FormTitle>
            <FormText>Key combo to toggle always on top functionality.</FormText>
            <br />
            <KeybindRecorder default={this.keybind} onChange={k => {
                this.keybind = k;
                Data.save('keybind', k);
            }}></KeybindRecorder>
            <br /><br />
            <FormDivider />
            <br />
            <Switch
                onChange={(value) => {
                    this.disableWhenMaximized = value;
                    Data.save('disableWhenMaximized', this.disableWhenMaximized);
                }}
                note="When the window is maximized, disable always on top functionality."
                defaultValue={this.disableWhenMaximized}
            >
                Disable When Maximized
            </Switch>
        </>
    }
}