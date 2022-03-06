/**
 * @name PinchToZoom
 * @author Qwerasd
 * @description Use pinch to zoom gestures in Discord.
 * @version 1.1.3
 * @authorId 140188899585687552
 * @updateUrl https://betterdiscord.app/gh-redirect?id=554
 */

enum Mode {
    IMAGES ,
    WHOLE_APP_NATIVE,
    WHOLE_APP_EMULATED
}

const ImageModal
    = BdApi.findModuleByDisplayName('ImageModal');

const { imageWrapper } = BdApi.findModuleByProps('imageWrapper');
const { downloadLink } = BdApi.findModuleByProps('downloadLink');

const
    FormTitle: React.ComponentClass
        = BdApi.findModuleByDisplayName('FormTitle'),
    FormText: React.ComponentClass
        = BdApi.findModuleByDisplayName('FormText');

const Slider: React.ComponentClass<any, any>
    = BdApi.findModuleByDisplayName('Slider');

const RadioGroup: React.ComponentClass<{
        value?: any,
        onChange?: (value: any) => void,
        options?: Array<{name: string, value: any}>,
    }>
    = BdApi.findModuleByDisplayName('RadioGroup');

class Radio extends BdApi.React.Component<
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

let document_move_listener;
const replace_document_move_listener = f => {
    document.removeEventListener('mousemove', document_move_listener);
    document_move_listener = f;
    document.addEventListener('mousemove', document_move_listener);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export default class PinchToZoom {

    default_settings = {
        mode: Mode.IMAGES,
        zoom_limit: 10,
        rate: 7,
    };

    start() {
        BdApi.injectCSS('PinchToZoom', /*CSS*/`
        .${imageWrapper} {
            overflow: visible;
        }
        .${downloadLink} {
            filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
        }
        `);

        this.initialize_mode();
    }

    initialize_mode () {
        const webFrame = require('electron').webFrame;
        BdApi.Patcher.unpatchAll('PinchToZoom');
        webFrame.setVisualZoomLevelLimits(1,1);
        const mode = this.get_setting('mode');
        switch (mode) {
            case Mode.IMAGES:
                this.patch_image_modal();
                break;
            case Mode.WHOLE_APP_NATIVE:
                webFrame.setVisualZoomLevelLimits(1,this.get_setting('zoom_limit'));
                break;
            case Mode.WHOLE_APP_EMULATED:
                // TODO: Emulated whole app zooming for systems that don't support it natively.
                break;
        }
    }

    patch_image_modal() {
        const zoom_limit = this.get_setting('zoom_limit');
        const rate = 150 - this.get_setting('rate') * 10;
        BdApi.Patcher.after('PinchToZoom', ImageModal.prototype, 'componentDidMount',
            that => {
                const lazy_image = that._reactInternals.child.child.stateNode;
                const initialize_zooming = () => {
                    const container = that._reactInternals.child.stateNode;
                    const img       = container.getElementsByTagName('img')[0] ?? container.getElementsByTagName('video')[0];
                    const {width: w, height: h, maxWidth, maxHeight} = that._reactInternals.child.memoizedProps.children[0].props;
                    const width  = Math.min(w, maxWidth);
                    const height = Math.min(h, maxHeight);
                    let zoom = 1,
                        x    = 0,
                        y    = 0;
                    const adjust_transform = () => {
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
                        throttle(() => img.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`);
                    };
                    let last_trackpad_use = 0;
                    container.addEventListener('wheel', e => {
                        // a mouse always gives wheelDeltaY increments of 40, and will never give deltaX
                        // also the user isn't gonna switch between a trackpad and mouse within 250ms
                        const is_mouse =
                            (Math.abs(e.wheelDeltaY) % 40 === 0)
                            && !e.deltaX
                            && (e.timeStamp - last_trackpad_use > 250);
                        // trackpads *will* give exact 40 increments in case of zoom gestures, but
                        // in that case we don't care anyway, since we wanna do the same behaviour
                        if (Math.abs(e.wheelDeltaY) % 40 !== 0) last_trackpad_use = e.timeStamp;
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
                            const {left, top, width, height} = container.getBoundingClientRect();
                            const mx = (e.clientX - left) - (width / 2);
                            const my = (e.clientY - top) - (height / 2);
                            x += mx * (1 - d);
                            y += my * (1 - d);
                        } else {
                            // pan
                            x -= e.deltaX;
                            y -= e.deltaY;
                        }
                        adjust_transform();
                    }, {passive: false});
                    const mouse_start = {x: 0, y: 0};
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
                        } else {
                            mouse_held = false;
                        }
                    });
                };
                if (lazy_image.state.readyState === 'READY') {
                    initialize_zooming();
                } else {
                    const old_componentDidUpdate = lazy_image.componentDidUpdate;
                    lazy_image.componentDidUpdate = (t) => {
                        if (lazy_image.state.readyState === 'READY') {
                            requestAnimationFrame(initialize_zooming);
                            lazy_image.componentDidUpdate = old_componentDidUpdate;
                        }
                        old_componentDidUpdate.call(lazy_image, t);
                    }
                }
            }
        );
    }

    stop() {
        BdApi.Patcher.unpatchAll('PinchToZoom');
        BdApi.clearCSS('PinchToZoom');
        document.removeEventListener('mousemove', document_move_listener);
    }

    get_setting (setting: string) {
        return BdApi.loadData('PinchToZoom', setting) ?? this.default_settings[setting];
    }

    set_setting (setting: string, value: any) {
        return BdApi.saveData('PinchToZoom', setting, value);
    }

    getSettingsPanel () {
        let mode = this.get_setting('mode');
        const mode_change = (value: string) => {
            mode = value;
            this.set_setting('mode', mode);
            this.initialize_mode();
        }
        let rate = this.get_setting('rate');
        const rate_change = (value: number) => {
            rate = value;
            this.set_setting('rate', rate);
            this.initialize_mode();
        }
        let zoom_limit = this.get_setting('zoom_limit');
        const zoom_limit_change = (value: number) => {
            zoom_limit = value;
            this.set_setting('zoom_limit', zoom_limit);
            this.initialize_mode();
        };
        return (<div id="ptz_settings">
            <FormTitle>Zoom Type</FormTitle>
            <Radio
                options={
                    [{
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
                    ]
                }
                onChange={mode_change}
                defaultValue={mode}
            ></Radio>
            <FormText><b>Whole App</b> enables the browser's built-in trackpad zoom for the entire app.</FormText>
            <br/>
            <FormTitle>Zoom Limit</FormTitle>
            <FormText>Maximum zoom level</FormText>
            <br/>
            <Slider
                minValue={2}
                maxValue={20}
                defaultValue={10}
                initialValue={zoom_limit}
                onValueChange={zoom_limit_change}
                markers={[2,4,6,8,10,12,14,16,18,20]}
                stickToMarkers={true}
                equidistant={true}
                onMarkerRender={v => `${v}x`}
            ></Slider>
            <br/>
            <FormTitle>Zoom Rate</FormTitle>
            <FormText>Higher value = faster zoom. Only applies to <b>Images</b> mode.</FormText>
            <br/>
            <Slider
                minValue={1}
                maxValue={10}
                defaultValue={7}
                initialValue={rate}
                onValueChange={rate_change}
                markers={[1,2,3,4,5,6,7,8,9,10]}
                stickToMarkers={true}
                equidistant={true}
            ></Slider>
        </div>);
    }
}
