/**
 * @name AlwaysOnTop
 * @author Qwerasd
 * @description Keep the Discord window from being hidden under other windows.
 * @version 1.0.0
 * @authorId 140188899585687552
 */

const
    FormTitle: React.ComponentClass
        = BdApi.findModuleByDisplayName('FormTitle'),
    FormText: React.ComponentClass
        = BdApi.findModuleByDisplayName('FormText');

const setAlwaysOnTop = (v: boolean): void => {
    //@ts-ignore
    window.DiscordNative.window.setAlwaysOnTop(0, v);
    BdApi.showToast(`Always on top ${v ? 'enabled' : 'disabled'}.`, {type: v ? 'success' : 'error'});
}

const isMac = process.platform === 'darwin';

interface Keybind {
    key: string;
    keyName: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
}

const { useState, useRef } = BdApi.React;

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

    const handleKeyDown = (e): void => {
        if (['Alt', 'Shift', 'Control', 'Meta'].includes(e.key)) return;
        if (recording) {
            const k = {
                key: e.key.toLowerCase(),
                keyName: e.code.slice(3),
                ctrl: e.ctrlKey,
                alt: e.altKey,
                shift: e.shiftKey,
                meta: e.metaKey
            };
            setKeybind(k);
            props.onChange(k);
            stopRecording();
        }
    }

    return (
        <div className={`keybind-recorder ${recording ? 'recording' : ''}`}>
            <span className="keybind-recorder-control-keys">{
                (keybind.meta  ? (isMac ? '⌘' : '⊞') : '') +
                (keybind.ctrl  ? '⌃' : '') +
                (keybind.alt   ? '⌥' : '') +
                (keybind.shift ? '⇧' : '')
            }</span>
            <span className="keybind-recorder-key">{keybind.keyName}</span>
            <span className="keybind-recorder-controls">
                <button onClick={startRecording}>Record</button>
                <button onClick={() => {setKeybind(props.default); props.onChange(props.default)}}>Reset</button>
            </span>
            <input type="text" ref={input} onKeyDown={handleKeyDown} />
        </div>
    )
}

export default class AlwaysOnTop {
    state: boolean = BdApi.loadData('AlwaysOnTop', 'state') ?? true;

    keybind: Keybind = BdApi.loadData('AlwaysOnTop', 'keybind') ?? {
        key: 't',
        keyName: 'T',
        ctrl: true,
        alt: false,
        shift: false,
        meta: true
    };

    boundKeyDown = this.onKeyDown.bind(this);

    start() {
        if (this.state) setAlwaysOnTop(true);
        document.addEventListener('keydown', this.boundKeyDown);
        BdApi.injectCSS('AlwaysOnTop', /* CSS */`
            .keybind-recorder {
                color: #fff;
                background-color: #000;
                position: relative;
                display: inline-block;
                width: 18.5ch;
                padding: 8px;
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

    onKeyDown (e: KeyboardEvent) {
        const { key, ctrl, alt, shift, meta } = this.keybind;
        if (e.key === key && e.ctrlKey === ctrl && e.altKey === alt && e.shiftKey === shift && e.metaKey === meta) {
            this.state = !this.state;
            setAlwaysOnTop(this.state);
            BdApi.saveData('AlwaysOnTop', 'state', this.state);
        }
    }

    getSettingsPanel () {
        return <>
            <FormTitle>Keybind</FormTitle>
            <FormText>Key combo to toggle always on top functionality.</FormText>
            <br />
            <KeybindRecorder default={this.keybind} onChange={k => {
                this.keybind = k;
                BdApi.saveData('AlwaysOnTop', 'keybind', k);
            }}></KeybindRecorder>
        </>
    }
}
