/**
 * @name PinchToZoom
 * @author Qwerasd
 * @description Use pinch to zoom gestures in Discord.
 * @version 2.0.5
 * @authorId 140188899585687552
 * @updateUrl https://betterdiscord.app/gh-redirect?id=554
 */
// utils/BdApi.ts
const { React, ReactDOM, Patcher, Webpack, Webpack: { getModule, waitForModule, Filters, Filters: { byProps } }, DOM, Data, UI } = new BdApi('PinchToZoom');
// utils/functional.ts
// utils/utils.ts
const AnimationFrameDebouncer = () => {
    let t;
    return (f, ...args) => {
        cancelAnimationFrame(t);
        t = requestAnimationFrame(() => f(...args));
    };
};
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
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
// utils/modules/filters.ts
const hasSubstrings = (str, ...subs) => typeof str === 'string' && subs.every(sub => str.includes(sub));
const SectionTitleFilter = m => m.Tags && hasSubstrings(m.toString?.(), '"faded","disabled","required"');
const FormTextFilter = m => m?.Sizes?.SIZE_32 && m.Colors;
const SliderFilter = m => m?.prototype?.renderMark;
// PinchToZoom/src/PinchToZoom.plugin.tsx
const ImageModal = getModule(m => m?.prototype?.render && m.toString?.()?.includes?.('renderMobileCloseButton'));
const { imageWrapper } = getModule(byProps('imageWrapper'));
const { downloadLink } = getModule(byProps('downloadLink'));
const FormTitle = getModule(SectionTitleFilter);
const FormText = getModule(FormTextFilter);
const Slider = getModule(SliderFilter);
const RadioGroup = getModule(m => m?.Sizes && m.toString?.()?.includes?.('radioItemClassName'));
const Radio = class extends BdApi.React.Component {
    constructor(props) {
        super(props);
        this.state = {
            value: props.defaultValue || props.options[0].value
        };
    }
    render() {
        return BdApi.React.createElement(RadioGroup, {
            options: this.props.options,
            value: this.state.value,
            onChange: selected => {
                this.setState({
                    value: selected.value
                });
                this.props.onChange(selected.value);
                this.forceUpdate();
            }
        });
    }
};
const throttle = AnimationFrameDebouncer();
const document_listener = SingletonListener(document);
// FIXED (2.0.1):
// - Restored mouse/trackpad detection for mouse scroll-wheel zooming without ctrl
// - Update panning bounds when target element base size changes (window resize / image modal zoom animation)
// - Better handling for whole app zooming (don't interfere with actual inputs for scrolling, etc.)
// FIXED (2.0.4):
// - Only stop propagation when eating scroll inputs - not doing this previously this broke trackpad scrolling for whole app mode.
const initializeZooming = ({ rate, zoom_limit, outer, inner, alt_pan = true, eat_scroll = true, pan_margin = 16 }) => {
    let { width, height } = inner.getBoundingClientRect();
    let zoom = 1,
        x = 0,
        y = 0;
    const outer_listener = SingletonListener(outer);
    const inner_listener = SingletonListener(inner);
    const resize_observer = new ResizeObserver(e => {
        const rect = e[0].contentRect;
        width = rect.width;
        height = rect.height;
    });
    resize_observer.observe(inner, { box: 'device-pixel-content-box' });
    const cleanup = () => {
        document_listener.clearAllListeners();
        outer_listener.clearAllListeners();
        inner_listener.clearAllListeners();
        resize_observer.disconnect();
        inner.style.transform = 'none';
        inner.style.removeProperty('transform');
    };
    const adjustTransform = () => {
        if (zoom === 1) {
            x = 0;
            y = 0;
        } else {
            const zw = width * zoom;
            const zh = height * zoom;
            const maxX = Math.max(0, 0.5 * (zw - width) + pan_margin);
            const maxY = Math.max(0, 0.5 * (zh - height) + pan_margin);
            if (x > maxX) x = maxX;
            else if (x < -maxX) x = -maxX;
            if (y > maxY) y = maxY;
            else if (y < -maxY) y = -maxY;
        }
        throttle(() => inner.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`);
    };
    let last_scroll_event = 0;
    outer_listener.setListener('scroll', e => {
        last_scroll_event = e.timeStamp;
    }, true);
    let last_trackpad_use = 0;
    outer_listener.setListener('wheel', e => {
        // @ts-ignore wheelDeltaY is deprecated, so TypeScript doesn't type it - but it's the only thing that can distinguish mouse from trackpad reliably.
        const { wheelDeltaY } = e;
        // a mouse always gives wheelDeltaY increments of 40, and will never give deltaX
        // also the user isn't gonna switch between a trackpad and mouse within 250ms
        const is_mouse = Math.abs(wheelDeltaY) % 40 === 0 && !e.deltaX && e.timeStamp - last_trackpad_use > 250;
        // trackpads *will* give exact 40 increments in case of zoom gestures, but
        // in that case we don't care anyway, since we wanna do the same behaviour
        if (Math.abs(wheelDeltaY) % 40 !== 0) last_trackpad_use = e.timeStamp;
        // If we don't we aren't explicitly zooming and don't want to eat scroll inputs
        // and this wheel event is coming from a scroll wheel, return early;
        // this event is not for us.
        if (!e.ctrlKey && !eat_scroll && is_mouse) return;
        // If we don't want to eat scroll inputs and a scroll event just happened
        // less than 250ms ago, return early; this event is not for us.
        if (!eat_scroll && e.timeStamp - last_scroll_event < 250) return;
        // If we we're zoomed in and want to eat scroll inputs, stop propagation.
        if (zoom !== 1 && eat_scroll) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (e.ctrlKey || eat_scroll && is_mouse) {
            // zoom
            const delta = e.deltaY + e.deltaX;
            const d = clamp(1 - delta / rate, 1 / zoom, zoom_limit / zoom);
            zoom *= d;
            // adjust panning accordingly
            x *= d;
            y *= d;
            // calculate location of mouse relative to center
            // in order to zoom in/out from the mouse location
            const { left, top, width: width2, height: height2 } = outer.getBoundingClientRect();
            const mx = e.clientX - left - width2 * 0.5;
            const my = e.clientY - top - height2 * 0.5;
            x += mx * (1 - d);
            y += my * (1 - d);
        } else {
            // pan
            x -= e.deltaX;
            y -= e.deltaY;
        }
        adjustTransform();
    }, { passive: false });
    const mouse_start = { x: 0, y: 0 };
    let mouse_held = false;
    inner_listener.setListener('mousedown', e => {
        if (e.buttons === 4 || alt_pan && e.buttons === 1 && e.altKey) {
            e.preventDefault();
            e.stopPropagation();
            mouse_start.x = e.clientX;
            mouse_start.y = e.clientY;
            mouse_held = true;
        }
    });
    // we have to put the mousemove listener on the document in case the mouse
    // exits the image while dragging
    document_listener.setListener('mousemove', e => {
        if (!document.body.contains(inner)) {
            // clean up after ourselves if our target is gone.
            cleanup();
            return;
        }
        if ((e.buttons === 4 || alt_pan && e.buttons === 1 && e.altKey) && mouse_held) {
            e.preventDefault();
            e.stopPropagation();
            // pan
            x += e.clientX - mouse_start.x;
            y += e.clientY - mouse_start.y;
            mouse_start.x = e.clientX;
            mouse_start.y = e.clientY;
            adjustTransform();
        } else {
            mouse_held = false;
        }
    });
    return cleanup;
};
module.exports = class PinchToZoom {
    constructor() {
        this.default_settings = { mode: 0, /*IMAGES*/ zoom_limit: 10, rate: 7 };
        this.cleanup_actions = [];
    }
    start() {
        DOM.addStyle(`
        .${imageWrapper} {
            overflow: visible;
        }
        .${downloadLink} {
            filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
        }
        `);
        this.initializeZoomMode();
    }
    initializeZoomMode() {
        this.doCleanup();
        const mode = this.getSetting('mode');
        switch (mode) {
        case 0:
            /*IMAGES*/
            this.patchImageModal();
            break;
        case 1:
            /*WHOLE_APP_NATIVE*/
            this.startNativeWholeAppZooming();
            break;
        case 2:
            /*WHOLE_APP_EMULATED*/
            this.startWholeAppZooming();
            break;
        }
    }
    startNativeWholeAppZooming() {
        // TODO: Fix or remove
        // const webFrame = require('electron').webFrame;
        // webFrame.setVisualZoomLevelLimits(1, this.getSetting('zoom_limit'));
        UI.showToast('[PinchToZoom] Native whole app zooming is currently broken. Use emulated instead.', { type: 'warn' });
    }
    startWholeAppZooming() {
        const zoom_limit = this.getSetting('zoom_limit');
        const rate = 150 - this.getSetting('rate') * 10;
        this.cleanup_actions.push(initializeZooming({
            zoom_limit,
            rate,
            outer: document.body,
            inner: document.getElementById('app-mount'),
            alt_pan: false,
            eat_scroll: false,
            pan_margin: 0
        }));
    }
    patchImageModal() {
        const zoom_limit = this.getSetting('zoom_limit');
        const rate = 150 - this.getSetting('rate') * 10;
        Patcher.after(ImageModal.prototype, 'componentDidMount', that => {
            const startZoom = () => {
                const outer = that._reactInternals.child.stateNode;
                const inner = outer.getElementsByTagName('img')[0] ?? outer.getElementsByTagName('video')[0];
                initializeZooming({ rate, zoom_limit, outer, inner });
            };
            const lazy_image = that._reactInternals.child.child.stateNode;
            if (lazy_image.state.readyState === 'READY') {
                startZoom();
            } else {
                const o_componentDidUpdate = lazy_image.componentDidUpdate;
                lazy_image.componentDidUpdate = t => {
                    if (lazy_image.state.readyState === 'READY') {
                        requestAnimationFrame(startZoom);
                        lazy_image.componentDidUpdate = o_componentDidUpdate;
                    }
                    o_componentDidUpdate.call(lazy_image, t);
                };
            }
        });
    }
    stop() {
        DOM.removeStyle();
        this.doCleanup();
    }
    doCleanup() {
        // const webFrame = require('electron').webFrame;
        // webFrame.setVisualZoomLevelLimits(1,1);
        Patcher.unpatchAll();
        document_listener.clearAllListeners();
        while (this.cleanup_actions.length) this.cleanup_actions.pop()();
    }
    getSetting(setting) {
        return Data.load(setting) ?? this.default_settings[setting];
    }
    setSetting(setting, value) {
        return Data.save(setting, value);
    }
    getSettingsPanel() {
        let mode = this.getSetting('mode');
        const modeChange = value => {
            mode = value;
            this.setSetting('mode', mode);
            this.initializeZoomMode();
        };
        let rate = this.getSetting('rate');
        const rateChange = value => {
            rate = value;
            this.setSetting('rate', rate);
            this.initializeZoomMode();
        };
        let zoom_limit = this.getSetting('zoom_limit');
        const zoomLimitChange = value => {
            zoom_limit = value;
            this.setSetting('zoom_limit', zoom_limit);
            this.initializeZoomMode();
        };
        return BdApi.React.createElement(
            'div', { id: 'ptz_settings' },
            BdApi.React.createElement(FormTitle, null, 'Zoom Type'),
            BdApi.React.createElement(Radio, {
                options: [{ value: 0, /*IMAGES*/ name: 'Images' }, { value: 2, /*WHOLE_APP_EMULATED*/ name: 'Whole App ᴱᴹᵁᴸᴬᵀᴱᴰ' }, { value: 1, /*WHOLE_APP_NATIVE*/ name: 'Whole App (CURRENTLY NON-FUNCTIONAL, USE EMULATED INSTEAD)' }],
                onChange: modeChange,
                defaultValue: mode
            }),
            BdApi.React.createElement('br', null),
            BdApi.React.createElement(FormTitle, null, 'Zoom Limit'),
            BdApi.React.createElement(FormText, null, 'Maximum zoom level'),
            BdApi.React.createElement('br', null),
            BdApi.React.createElement(Slider, {
                minValue: 2,
                maxValue: 20,
                defaultValue: 10,
                initialValue: zoom_limit,
                onValueChange: zoomLimitChange,
                markers: [
                    2, 4, 6, 8, 10, 12, 14, 16, 18, 20
                ],
                stickToMarkers: true,
                equidistant: true,
                onMarkerRender: v => `${v}x`
            }),
            BdApi.React.createElement('br', null),
            BdApi.React.createElement(FormTitle, null, 'Zoom Rate'),
            BdApi.React.createElement(FormText, null, 'Higher value = faster zoom'),
            BdApi.React.createElement('br', null),
            BdApi.React.createElement(Slider, {
                minValue: 1,
                maxValue: 10,
                defaultValue: 7,
                initialValue: rate,
                onValueChange: rateChange,
                markers: [
                    1, 2, 3, 4, 5, 6, 7, 8, 9, 10
                ],
                stickToMarkers: true,
                equidistant: true
            })
        );
    }
};