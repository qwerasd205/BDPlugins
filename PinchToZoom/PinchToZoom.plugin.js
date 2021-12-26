/**
 * @name PinchToZoom
 * @author Qwerasd
 * @description Use pinch to zoom gestures in Discord.
 * @version 1.1.1
 * @authorId 140188899585687552
 * @updateUrl https://betterdiscord.app/gh-redirect?id=554
 */
Object.defineProperty(exports, "__esModule", { value: true });
var Mode;
(function (Mode) {
    Mode[Mode["IMAGES"] = 0] = "IMAGES";
    Mode[Mode["WHOLE_APP_NATIVE"] = 1] = "WHOLE_APP_NATIVE";
    Mode[Mode["WHOLE_APP_EMULATED"] = 2] = "WHOLE_APP_EMULATED";
})(Mode || (Mode = {}));
const ImageModal = BdApi.findModuleByDisplayName('ImageModal');
const { imageWrapper } = BdApi.findModuleByProps('imageWrapper');
const { downloadLink } = BdApi.findModuleByProps('downloadLink');
const FormTitle = BdApi.findModuleByDisplayName('FormTitle'), FormText = BdApi.findModuleByDisplayName('FormText');
const Slider = BdApi.findModuleByDisplayName('Slider');
const RadioGroup = BdApi.findModuleByDisplayName('RadioGroup');
class Radio extends BdApi.React.Component {
    constructor(props) {
        super(props);
        this.state = {
            value: props.defaultValue || props.options[0].value
        };
    }
    render() {
        return (BdApi.React.createElement(RadioGroup, { options: this.props.options, value: this.state.value, onChange: (selected) => {
                this.setState({ value: selected.value });
                this.props.onChange(selected.value);
                this.forceUpdate();
            } }));
    }
}
let requested = null;
const throttle = f => {
    cancelAnimationFrame(requested);
    requestAnimationFrame(f);
};
let document_move_listener;
const replace_document_move_listener = f => {
    document.removeEventListener('mousemove', document_move_listener);
    document_move_listener = f;
    document.addEventListener('mousemove', document_move_listener);
};
class PinchToZoom {
    constructor() {
        this.default_settings = {
            mode: Mode.IMAGES,
            zoom_limit: 10,
            rate: 7,
        };
    }
    start() {
        BdApi.injectCSS('PinchToZoom', /*CSS*/ `
        .${imageWrapper} {
            overflow: visible;
        }
        .${downloadLink} {
            filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
        }
        `);
        this.initialize_mode();
    }
    initialize_mode() {
        const webFrame = require('electron').webFrame;
        BdApi.Patcher.unpatchAll('PinchToZoom');
        webFrame.setVisualZoomLevelLimits(1, 1);
        const mode = this.get_setting('mode');
        switch (mode) {
            case Mode.IMAGES:
                this.patch_image_modal();
                break;
            case Mode.WHOLE_APP_NATIVE:
                webFrame.setVisualZoomLevelLimits(1, this.get_setting('zoom_limit'));
                break;
            case Mode.WHOLE_APP_EMULATED:
                // TODO: Emulated whole app zooming for systems that don't support it natively.
                break;
        }
    }
    patch_image_modal() {
        const zoom_limit = this.get_setting('zoom_limit');
        const rate = 150 - this.get_setting('rate') * 10;
        BdApi.Patcher.after('PinchToZoom', ImageModal.prototype, 'componentDidMount', that => {
            // sometimes the LazyImage component does weird stuff and this RAF (mostly) avoid that.
            requestAnimationFrame(() => {
                var _a;
                const container = that._reactInternals.child.stateNode;
                const img = (_a = container.getElementsByTagName('img')[0]) !== null && _a !== void 0 ? _a : container.getElementsByTagName('video')[0];
                const { width: w, height: h, maxWidth, maxHeight } = that._reactInternals.child.memoizedProps.children[0].props;
                const width = Math.min(w, maxWidth);
                const height = Math.min(h, maxHeight);
                let zoom = 1, x = 0, y = 0;
                const adjust_transform = () => {
                    if (zoom === 1) {
                        x = 0;
                        y = 0;
                    }
                    else {
                        const zw = width * zoom;
                        const zh = height * zoom;
                        const maxX = Math.max(0, 0.5 * (zw - width + 16));
                        const maxY = Math.max(0, 0.5 * (zh - height + 16));
                        if (x > maxX)
                            x = maxX;
                        else if (x < -maxX)
                            x = -maxX;
                        if (y > maxY)
                            y = maxY;
                        else if (y < -maxY)
                            y = -maxY;
                    }
                    throttle(() => img.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`);
                };
                let last_trackpad_use = 0;
                container.addEventListener('wheel', e => {
                    // a mouse always gives wheelDeltaY increments of 120, and will never give deltaX
                    // also the user isn't gonna switch between a trackpad and mouse within 250ms
                    const is_mouse = (Math.abs(e.wheelDeltaY) % 120 === 0)
                        && !e.deltaX
                        && (e.timeStamp - last_trackpad_use > 250);
                    // trackpads *will* give exact 120 increments in case of zoom gestures, but
                    // in that case we don't care anyway, since we wanna do the same behaviour
                    if (Math.abs(e.wheelDeltaY) % 120 !== 0)
                        last_trackpad_use = e.timeStamp;
                    if (e.ctrlKey || is_mouse) {
                        // zoom
                        e.preventDefault();
                        e.stopPropagation();
                        const delta = e.deltaY + e.deltaX;
                        const d = 1 - delta / rate;
                        zoom *= d;
                        if (zoom < 1)
                            zoom = 1;
                        else if (zoom > zoom_limit)
                            zoom = zoom_limit;
                        else {
                            x *= d;
                            y *= d;
                            // calculate location of mouse relative to center
                            // in order to zoom in/out from the mouse location
                            const { left, top, width, height } = container.getBoundingClientRect();
                            const mx = (e.clientX - left) - (width / 2);
                            const my = (e.clientY - top) - (height / 2);
                            x += mx * (1 - d);
                            y += my * (1 - d);
                        }
                    }
                    else {
                        // pan
                        x -= e.deltaX;
                        y -= e.deltaY;
                    }
                    adjust_transform();
                }, { passive: false });
                const mouse_start = { x: 0, y: 0 };
                let mouse_held = false;
                img.addEventListener('mousedown', e => {
                    if (e.buttons === 4 || (e.buttons === 1 && e.altKey)) {
                        e.preventDefault();
                        mouse_start.x = e.clientX;
                        mouse_start.y = e.clientY;
                        mouse_held = true;
                    }
                });
                // we have to put the mousemove listener on the document in case the mouse
                // exits the image while dragging
                replace_document_move_listener(e => {
                    if (!document.body.contains(img)) {
                        // clean up after ourselves after the modal is closed
                        document.removeEventListener('mousemove', document_move_listener);
                        return;
                    }
                    if ((e.buttons === 4 || (e.buttons === 1 && e.altKey)) && mouse_held) {
                        // pan
                        x += e.clientX - mouse_start.x;
                        y += e.clientY - mouse_start.y;
                        mouse_start.x = e.clientX;
                        mouse_start.y = e.clientY;
                        adjust_transform();
                    }
                    else {
                        mouse_held = false;
                    }
                });
            });
        });
    }
    stop() {
        BdApi.Patcher.unpatchAll('PinchToZoom');
        BdApi.clearCSS('PinchToZoom');
        document.removeEventListener('mousemove', document_move_listener);
    }
    get_setting(setting) {
        var _a;
        return (_a = BdApi.loadData('PinchToZoom', setting)) !== null && _a !== void 0 ? _a : this.default_settings[setting];
    }
    set_setting(setting, value) {
        return BdApi.saveData('PinchToZoom', setting, value);
    }
    getSettingsPanel() {
        let mode = this.get_setting('mode');
        const mode_change = (value) => {
            mode = value;
            this.set_setting('mode', mode);
            this.initialize_mode();
        };
        let rate = this.get_setting('rate');
        const rate_change = (value) => {
            rate = value;
            this.set_setting('rate', rate);
            this.initialize_mode();
        };
        let zoom_limit = this.get_setting('zoom_limit');
        const zoom_limit_change = (value) => {
            zoom_limit = value;
            this.set_setting('zoom_limit', zoom_limit);
            this.initialize_mode();
        };
        return (BdApi.React.createElement("div", { id: "ptz_settings" },
            BdApi.React.createElement(FormTitle, null, "Zoom Type"),
            BdApi.React.createElement(Radio, { options: [{
                        value: Mode.IMAGES,
                        name: 'Images'
                    },
                    {
                        value: Mode.WHOLE_APP_NATIVE,
                        name: 'Whole App'
                    },
                    // {
                    //     value: Mode.WHOLE_APP_EMULATED,
                    //     name: 'Whole App (emulated)'
                    // }
                ], onChange: mode_change, defaultValue: mode }),
            BdApi.React.createElement(FormText, null,
                BdApi.React.createElement("b", null, "Whole App"),
                " enables the browser's built-in trackpad zoom for the entire app."),
            BdApi.React.createElement("br", null),
            BdApi.React.createElement(FormTitle, null, "Zoom Limit"),
            BdApi.React.createElement(FormText, null, "Maximum zoom level"),
            BdApi.React.createElement("br", null),
            BdApi.React.createElement(Slider, { minValue: 2, maxValue: 20, defaultValue: 10, initialValue: zoom_limit, onValueChange: zoom_limit_change, markers: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20], stickToMarkers: true, equidistant: true, onMarkerRender: v => `${v}x` }),
            BdApi.React.createElement("br", null),
            BdApi.React.createElement(FormTitle, null, "Zoom Rate"),
            BdApi.React.createElement(FormText, null,
                "Higher value = faster zoom. Only applies to ",
                BdApi.React.createElement("b", null, "Images"),
                " mode."),
            BdApi.React.createElement("br", null),
            BdApi.React.createElement(Slider, { minValue: 1, maxValue: 10, defaultValue: 7, initialValue: rate, onValueChange: rate_change, markers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], stickToMarkers: true, equidistant: true })));
    }
}
exports.default = PinchToZoom;
