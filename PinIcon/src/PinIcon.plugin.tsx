/**
 * @name PinIcon
 * @author Qwerasd
 * @description Add an icon to messages that have been pinned.
 * @version 0.0.1
 * @authorId 140188899585687552
 */

const MessageModule
    = BdApi.findModule(m => m.default && m.default.toString && m.default.toString().includes('childrenRepliedMessage'));

const {TooltipContainer}: {TooltipContainer: React.ComponentClass<{text: string, position: string}>}
    = BdApi.findModuleByProps("TooltipContainer");
const Pin: React.ComponentClass<{width: number}>
    = BdApi.findModuleByDisplayName('Pin');

export default class TestPlugin {
    unpatch: Function;

    start() {
        BdApi.injectCSS('PinIcon', /*CSS*/`
        span.plugin_PinIcon {
            color: var(--channels-default);
            margin-inline-start: 3px;
        }
        
        span.plugin_PinIcon > div {
            display: inline-block;
        }
        
        span.plugin_PinIcon > div > svg {
            vertical-align: -6px;
        }`);

        //@ts-ignore
        this.unpatch = BdApi.monkeyPatch(MessageModule, 'default', {
            after: (patchData) => {
                const isPinned = patchData.thisObject.props.childrenMessageContent.props.message.pinned;
                if (isPinned) {
                    patchData.thisObject.props.childrenMessageContent.props.content.push(
                        <span className="plugin_PinIcon">
                            <TooltipContainer text="Pinned" position="bottom">
                                <Pin width={18}/>
                            </TooltipContainer>
                        </span>
                    );
                }
                return patchData.returnValue;
            }
        });
    }

    stop() {
        if (this.unpatch) this.unpatch();
        BdApi.clearCSS('PinIcon');
    }
}
