/**
 * @name PinchToZoom
 * @author Qwerasd
 * @description Use pinch to zoom gestures in Discord.
 * @version 2.0.0
 * @authorId 140188899585687552
 * @updateUrl https://betterdiscord.app/gh-redirect?id=554
 */

const enum Mode {
    IMAGES ,
    WHOLE_APP_NATIVE,
    WHOLE_APP_EMULATED
}

import { Patcher, getModule, byProps, DOM, Data, UI } from 'utils/BdApi';

import { SingletonListener } from 'utils/utils';

const ImageModal
    = getModule(m => m?.prototype?.render && m.toString?.()?.includes?.('renderMobileCloseButton'));

const { imageWrapper } = getModule(byProps('imageWrapper'));
const { downloadLink } = getModule(byProps('downloadLink'));

const FormTitle: React.ComponentClass
    = getModule(byProps('Tags', 'Sizes'));

const FormText: React.ComponentClass
    = getModule(m => m?.Sizes?.SIZE_32 && m.Colors);

const Slider: React.ComponentClass<any, any>
    = getModule(m => m?.prototype?.renderMark);

const RadioGroup: React.ComponentClass<{
        value?: any,
        onChange?: (value: any) => void,
        options?: Array<{name: string, value: any}>,
    }>
    = getModule(m => m?.Sizes && m.toString?.()?.includes?.("radioItemClassName"));

const Radio = class extends BdApi.React.Component<
    {options: Array<{name: string, value: any}>, onChange: (value: any) => void, defaultValue?: any},
    {value: any}
> {
    constructor (props: any) {
        super(props);
        this.state = {
            value: props.defaultValue || props.options[0].value
        };
    }

    render() {
        return (<RadioGroup
            options={this.props.options}
            value={this.state.value}
            onChange={(selected) => {
                this.setState({value: selected.value});
                this.props.onChange(selected.value);
                this.forceUpdate();
            }}
        ></RadioGroup>);
    }
}

let requested = null;
const throttle = f => {
    cancelAnimationFrame(requested);
    requestAnimationFrame(f);
}

const document_listener = SingletonListener(document);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const initializeZooming = ({
    rate,
    zoom_limit,
    outer,
    inner,
    alt_pan = true
}: {
    rate: number,
    zoom_limit: number,
    outer: HTMLElement,
    inner: HTMLElement,
    alt_pan?: boolean
}) => {
    const { width, height } = inner.getBoundingClientRect();
    let zoom = 1,
        x    = 0,
        y    = 0;

    const outer_listener = SingletonListener(outer);
    const inner_listener = SingletonListener(inner);
    
    const cleanup = () => {
        document_listener.clearAllListeners();
        outer_listener.clearAllListeners();
        inner_listener.clearAllListeners();
        inner.style.transform   = undefined;
    };
    
    const adjustTransform = () => {
        if (zoom === 1) {
            x = 0; y = 0;
        } else {
            const zw = width  * zoom;
            const zh = height * zoom;
            const maxX = Math.max(0, 0.5 * (zw - width  + 16));
            const maxY = Math.max(0, 0.5 * (zh - height + 16));
            if (x >  maxX)      x =  maxX;
            else if (x < -maxX) x = -maxX;
            if (y >  maxY)      y =  maxY;
            else if (y < -maxY) y = -maxY;
        }
        throttle(() => inner.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`);
    };

    let last_trackpad_use = 0;
    outer_listener.setListener('wheel', e => {
        // a mouse always gives deltaY increments of 40, and will never give deltaX
        // also the user isn't gonna switch between a trackpad and mouse within 250ms
        const is_mouse =
            (Math.abs(e.deltaY) % 40 === 0)
            && !e.deltaX
            && (e.timeStamp - last_trackpad_use > 250);
        // trackpads *will* give exact 40 increments in case of zoom gestures, but
        // in that case we don't care anyway, since we wanna do the same behaviour
        if (Math.abs(e.deltaY) % 40 !== 0) last_trackpad_use = e.timeStamp;
        if (e.ctrlKey || is_mouse) {
            // zoom
            e.preventDefault();
            e.stopPropagation();
            const delta = e.deltaY + e.deltaX;
            const d = clamp(
                (1 - delta / rate),
                1/zoom, zoom_limit/zoom
            );
            zoom *= d;
            // adjust panning accordingly
            x *= d;
            y *= d;
            // calculate location of mouse relative to center
            // in order to zoom in/out from the mouse location
            const {left, top, width, height} = outer.getBoundingClientRect();
            const mx = (e.clientX - left) - (width / 2);
            const my = (e.clientY - top) - (height / 2);
            x += mx * (1 - d);
            y += my * (1 - d);
        } else {
            // pan
            x -= e.deltaX;
            y -= e.deltaY;
        }
        adjustTransform();
    }, {passive: false});

    const mouse_start = {x: 0, y: 0};
    let mouse_held = false;
    inner_listener.setListener('mousedown', e => {
        if (e.buttons === 4 || (alt_pan && e.buttons === 1 && e.altKey)) {
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
        if ((e.buttons === 4 || (alt_pan && e.buttons === 1 && e.altKey)) && mouse_held) {
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

export = class PinchToZoom {

    default_settings = {
        mode: Mode.IMAGES,
        zoom_limit: 10,
        rate: 7,
    };

    cleanup_actions: (() => void)[] = [];

    start() {
        DOM.addStyle(/*CSS*/`
        .${imageWrapper} {
            overflow: visible;
        }
        .${downloadLink} {
            filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
        }
        `);

        this.initializeZoomMode();
    }

    initializeZoomMode () {
        this.doCleanup();
        const mode = this.getSetting('mode');
        switch (mode) {
            case Mode.IMAGES:
                this.patchImageModal();
                break;
            case Mode.WHOLE_APP_NATIVE:
                this.startNativeWholeAppZooming();
                break;
            case Mode.WHOLE_APP_EMULATED:
                this.startWholeAppZooming();
                break;
        }
    }

    startNativeWholeAppZooming () {
        // TODO: Fix or remove
        // const webFrame = require('electron').webFrame;
        // webFrame.setVisualZoomLevelLimits(1, this.getSetting('zoom_limit'));
        UI.showToast('[PinchToZoom] Native whole app zooming is currently broken. Use emulated instead.', { type: 'warn' });
    }

    startWholeAppZooming () {
        const zoom_limit = this.getSetting('zoom_limit');
        const rate = 150 - this.getSetting('rate') * 10;
        this.cleanup_actions.push(
            initializeZooming({
                zoom_limit, rate,
                outer: document.body,
                inner: document.getElementById('app-mount'),
                alt_pan: false
            })
        );
    }

    patchImageModal () {
        const zoom_limit = this.getSetting('zoom_limit');
        const rate = 150 - this.getSetting('rate') * 10;
        Patcher.after(ImageModal.prototype, 'componentDidMount',
            that => {
                const startZoom = () => {
                    const outer = that._reactInternals.child.stateNode as HTMLElement;
                    const inner = (outer.getElementsByTagName('img')[0] ?? outer.getElementsByTagName('video')[0]) as HTMLElement;
                    initializeZooming({
                        rate, zoom_limit, outer, inner
                    });
                };

                const lazy_image = that._reactInternals.child.child.stateNode;

                if (lazy_image.state.readyState === 'READY') {
                    startZoom();
                } else {
                    const o_componentDidUpdate = lazy_image.componentDidUpdate;
                    lazy_image.componentDidUpdate = (t) => {
                        if (lazy_image.state.readyState === 'READY') {
                            requestAnimationFrame(startZoom);
                            lazy_image.componentDidUpdate = o_componentDidUpdate;
                        }
                        o_componentDidUpdate.call(lazy_image, t);
                    }
                }
            }
        );
    }

    stop() {
        DOM.removeStyle();
        this.doCleanup();
    }

    doCleanup () {
        // const webFrame = require('electron').webFrame;
        // webFrame.setVisualZoomLevelLimits(1,1);
        Patcher.unpatchAll();
        document_listener.clearAllListeners();
        while (this.cleanup_actions.length) this.cleanup_actions.pop()();
    }

    getSetting (setting: string) {
        return Data.load(setting) ?? this.default_settings[setting];
    }

    setSetting (setting: string, value: any) {
        return Data.save(setting, value);
    }

    getSettingsPanel () {
        let mode = this.getSetting('mode');
        const modeChange = (value: string) => {
            mode = value;
            this.setSetting('mode', mode);
            this.initializeZoomMode();
        }
        let rate = this.getSetting('rate');
        const rateChange = (value: number) => {
            rate = value;
            this.setSetting('rate', rate);
            this.initializeZoomMode();
        }
        let zoom_limit = this.getSetting('zoom_limit');
        const zoomLimitChange = (value: number) => {
            zoom_limit = value;
            this.setSetting('zoom_limit', zoom_limit);
            this.initializeZoomMode();
        };
        return (<div id="ptz_settings">
            <FormTitle>Zoom Type</FormTitle>
            <br/>
            <Radio
                options={
                    [
                        {
                            value: Mode.IMAGES,
                            name: 'Images'
                        },
                        {
                            value: Mode.WHOLE_APP_EMULATED,
                            name: 'Whole App ᴱᴹᵁᴸᴬᵀᴱᴰ'
                        },
                        {
                            value: Mode.WHOLE_APP_NATIVE,
                            name: 'Whole App (CURRENTLY NON-FUNCTIONAL, USE EMULATED INSTEAD)'
                        }
                    ]
                }
                onChange={modeChange}
                defaultValue={mode}
            ></Radio>
            <br/>
            <FormTitle>Zoom Limit</FormTitle>
            <FormText>Maximum zoom level</FormText>
            <br/>
            <Slider
                minValue={2}
                maxValue={20}
                defaultValue={10}
                initialValue={zoom_limit}
                onValueChange={zoomLimitChange}
                markers={[2,4,6,8,10,12,14,16,18,20]}
                stickToMarkers={true}
                equidistant={true}
                onMarkerRender={v => `${v}x`}
            ></Slider>
            <br/>
            <FormTitle>Zoom Rate</FormTitle>
            <FormText>Higher value = faster zoom</FormText>
            <br/>
            <Slider
                minValue={1}
                maxValue={10}
                defaultValue={7}
                initialValue={rate}
                onValueChange={rateChange}
                markers={[1,2,3,4,5,6,7,8,9,10]}
                stickToMarkers={true}
                equidistant={true}
            ></Slider>
        </div>);
    }
}
