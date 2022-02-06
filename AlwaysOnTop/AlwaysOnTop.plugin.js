/**
 * @name AlwaysOnTop
 * @author Qwerasd
 * @description Keep the Discord window from being hidden under other windows.
 * @version 0.0.1
 * @authorId 140188899585687552
 */
Object.defineProperty(exports, "__esModule", { value: true });
const setAlwaysOnTop = (v) => {
    //@ts-ignore
    window.DiscordNative.window.setAlwaysOnTop(0, v);
    BdApi.showToast(`Always on top ${v ? 'enabled' : 'disabled'}.`, { type: v ? 'success' : 'error' });
};
class AlwaysOnTop {
    constructor() {
        var _a;
        this.state = (_a = BdApi.loadData('AlwaysOnTop', 'state')) !== null && _a !== void 0 ? _a : true;
        this.boundKeyDown = this.onKeyDown.bind(this);
    }
    start() {
        if (this.state)
            setAlwaysOnTop(true);
        document.addEventListener('keydown', this.boundKeyDown);
    }
    stop() {
        setAlwaysOnTop(false);
        document.removeEventListener('keydown', this.boundKeyDown);
    }
    onKeyDown(e) {
        // TODO: Make this keybind configurable
        // CTRL + META + T
        if (e.ctrlKey && e.metaKey && e.key === 't') {
            this.state = !this.state;
            setAlwaysOnTop(this.state);
            BdApi.saveData('AlwaysOnTop', 'state', this.state);
        }
    }
}
exports.default = AlwaysOnTop;
