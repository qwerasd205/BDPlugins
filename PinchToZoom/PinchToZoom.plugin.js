/**
 * @name PinchToZoom
 * @author Qwerasd
 * @description Adds support for zooming and panning the image modal with trackpad gestures.
 * @version 1.0.0
 * @authorId 140188899585687552
 * @updateUrl https://betterdiscord.app/gh-redirect?id=554
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ImageModal = BdApi.findModuleByDisplayName('ImageModal');
const { imageWrapper } = BdApi.findModuleByProps('imageWrapper');
const { downloadLink } = BdApi.findModuleByProps('downloadLink');
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
    start() {
        BdApi.injectCSS('PinchToZoom', /*CSS*/ `
        .${imageWrapper} {
            overflow: visible;
        }
        .${downloadLink} {
            filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.5));
        }
        `);
        BdApi.Patcher.after('PinchToZoom', ImageModal.prototype, 'componentDidMount', that => {
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
                        const d = 1 - delta / 75;
                        zoom *= d;
                        if (zoom < 1)
                            zoom = 1;
                        else if (zoom > 16)
                            zoom = 16;
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
}
exports.default = PinchToZoom;
