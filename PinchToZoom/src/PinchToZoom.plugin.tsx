/**
 * @name PinchToZoom
 * @author Qwerasd
 * @description Adds support for zooming and panning the image modal with trackpad gestures.
 * @version 0.0.1
 * @authorId 140188899585687552
 */

const ImageModal
    = BdApi.findModuleByDisplayName('ImageModal');

const { imageWrapper } = BdApi.findModuleByProps('imageWrapper');

export default class PinchToZoom {
    start() {
        BdApi.injectCSS('PinchToZoom', /*CSS*/`
        .${imageWrapper} {
            overflow: visible;
        }
        `);

        BdApi.Patcher.after('PinchToZoom', ImageModal.prototype, 'componentDidMount',
            that => {
                requestAnimationFrame(() => {
                    const container = that._reactInternals.child.stateNode;
                    const img       = container.getElementsByTagName('img')[0];
                    const {width, height} = that._reactInternals.child.memoizedProps.children[0].props;
                    let zoom = 1,
                        x    = 0,
                        y    = 0;
                    container.addEventListener('wheel', e => {
                        if (e.ctrlKey) {
                            // zoom
                            e.preventDefault();
                            e.stopPropagation();
                            const delta = e.deltaY + e.deltaX;
                            zoom *= 1 - delta / 75;
                            if (zoom < 1)       zoom = 1;
                            else if (zoom > 16) zoom = 16;
                            else {
                                x *= 1 - delta / 75;
                                y *= 1 - delta / 75;
                            }
                        } else {
                            // pan
                            x -= e.deltaX;
                            y -= e.deltaY;
                        }
                        if (zoom === 1) {
                            x = 0; y = 0;
                        } else {
                            const zw = width  * zoom;
                            const zh = height * zoom;
                            const maxX = 0.5 * (zw - width);
                            const maxY = 0.5 * (zh - height);
                            if (x >  maxX)      x =  maxX;
                            else if (x < -maxX) x = -maxX;
                            if (y >  maxY)      y =  maxY;
                            else if (y < -maxY) y = -maxY;
                        }
                        img.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
                    }, {passive: false});
                });
            }
        );
    }

    stop() {
        BdApi.Patcher.unpatchAll('PinchToZoom');
        BdApi.clearCSS('PinchToZoom');
    }
}
