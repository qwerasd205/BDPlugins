/**
 * @name QuickView
 * @author Qwerasd
 * @description View avatars, icons, banners, thumbnails, and emojis with alt + click.
 * @version 1.1.2
 * @authorId 140188899585687552
 * @updateUrl https://betterdiscord.app/gh-redirect?id=644
 */
// utils/BdApi.ts
const { React, ReactDOM, Patcher, Webpack, Webpack: { getModule, waitForModule, Filters, Filters: { byProps } }, DOM, Data, UI } = new BdApi('QuickView');
// utils/functional.ts
// utils/utils.ts
const walkTree = (elem, filter, keys = [
    'child', 'alternate', 'sibling', 'return'
], seen = new WeakSet()) => {
    if (elem == null) return false;
    if (seen.has(elem)) return false;
    if (filter(elem)) return elem;
    seen.add(elem);
    for (const key of keys) {
        if (elem[key] != null) {
            const res = walkTree(elem[key], filter, keys, seen);
            if (res) return res;
        }
    }
    return false;
};
const AnimationFrameDebouncer = () => {
    let t;
    return (f, ...args) => {
        cancelAnimationFrame(t);
        t = requestAnimationFrame(() => f(...args));
    };
};
const getKey = (module2, f) => {
    for (const key in module2) {
        if (f(module2[key])) return key;
    }
};
const findKey = (object, f) => {
    for (const key in object) {
        if (f(key)) return key;
    }
};
// utils/react.ts
const getRenderedChildType = (c, f, props = {}) => {
    // Create a temporary root to render our parent component in.
    const root = document.createElement('div');
    // Create an instance of the component and render it in our root.
    ReactDOM.render(React.createElement(c, props), root);
    // Grab the internal fiber from the root;
    const fiber = root[findKey(root, k => k.startsWith('__reactContainer$'))];
    // Walk the tree from the fiber until we find a type matching our filter `f`
    const result = walkTree(fiber, e => e.type && typeof e.type !== 'string' && f(e.type));
    // ! Clean up the React DOM now that we have what we need ! //
    ReactDOM.unmountComponentAtNode(root);
    return result && result.type;
};
// utils/modules/filters.ts
const hasSubstrings = (str, ...subs) => typeof str === 'string' && subs.every(sub => str.includes(sub));
const PopoutHandlerFilter = m => m?.Align && m.Positions && m.contextType && m.defaultProps?.autoInvert != null;
const ListAvatarFilter = m => m.Sizes?.MINI && m.defaultProps?.size && m.defaultProps.tooltipPosition;
const EmbedFilter = m => m?.prototype?.renderAuthor && m.prototype.renderMedia;
const VoiceCallAvatarFilter = m => m?.prototype?.renderVoiceCallAvatar;
const MediaPlayerFilter = m => hasSubstrings(m.prototype?.render?.toString?.(), '"mediaPlayerClassName","poster"');
const ChannelListHeaderFilter = m => hasSubstrings(m.type?.toString?.(), 'hasCommunityInfoSubheader');
const FriendsListAvatarFilter = m => hasSubstrings(m.type?.toString?.(), '"user","size","animate","aria-hidden"');
const EmojiFilter = m => hasSubstrings(m.toString?.(), 'autoplay,reduceMotion:');
const BannerFilter = m => hasSubstrings(m.toString?.(), 'overrideAvatarDecorationURL');
const AvatarFilter = m => hasSubstrings(m.toString?.(), 'typingIndicatorRef', 'statusBackdropColor');
const EXPORTS_RichPresenceFilter = m => m.prototype?.renderImage && m.prototype.renderGameImage;
// utils/css.ts
const makeSelector = class_name => '.' + class_name?.split(' ').join('.');
const asyncCSS = (signal, template, classname_modules) => {
    const debounce = AnimationFrameDebouncer();
    const discovered = {};
    const updateCSS = () => DOM.addStyle(template(discovered));
    for (const [keys, filter] of classname_modules) {
        const map = new Map(Array.isArray(keys) ? keys.map(k => [k, k]) : Object.entries(keys));
        for (const name of map.values()) {
            discovered[name] = '#Q_AWAITING_SELECTOR';
        }
        (async () => {
            const m = await waitForModule(filter, { signal });
            if (!m) return;
            for (const k of map.keys()) {
                const name = map.get(k);
                if ((k in m) && typeof m[k] === 'string') {
                    discovered[name] = makeSelector(m[k]);
                }
            }
            debounce(updateCSS);
        })();
    }
    debounce(updateCSS);
    signal.addEventListener('abort', () => {
        DOM.removeStyle();
        debounce(() => {});
    });
};
// QuickView/src/style.scss
const css = s => /*CSS*/`
${s.hasBanner} {
  z-index: 10;
}

[class*=avatar i] rect {
  pointer-events: none;
}
[class*=avatar i]:is(${s.pointer}) {
  cursor: zoom-in;
}

header > svg + div [class*=avatar],
${s.avatarWrapper}:is(${s.pointer}),
[class*=bannerPremium],
${s.embedAuthorIcon},
${s.bannerImg} {
  cursor: zoom-in;
}

body.quickview-alt-key ${s.peopleListItem} div[class*=avatar],
body.quickview-alt-key ${s.roleIcon},
body.quickview-alt-key ${s.server} div,
body.quickview-alt-key ${s.chat_avatar},
body.quickview-alt-key ${s.listAvatar},
body.quickview-alt-key ${s.userAvatar},
body.quickview-alt-key img.emoji {
  cursor: zoom-in;
}
body.quickview-alt-key ${s.activity} img,
body.quickview-alt-key ${s.activity} ${s.gameIcon},
body.quickview-alt-key ${s.activity} ${s.screenshareIcon},
body.quickview-alt-key div[class*=Activity-] img,
body.quickview-alt-key div[class*=Activity-] ${s.gameIcon},
body.quickview-alt-key div[class*=Activity-] ${s.screenshareIcon} {
  cursor: zoom-in;
}
body.quickview-alt-key ${s.users_avatar}, body.quickview-alt-key ${s.users_avatar} > div,
body.quickview-alt-key ${s.dmlist_avatar},
body.quickview-alt-key ${s.dmlist_avatar} > div,
body.quickview-alt-key ${s.avatarHoverTarget},
body.quickview-alt-key ${s.avatarHoverTarget} > div {
  cursor: zoom-in;
}
body.quickview-alt-key ${s.embedVideo} {
  cursor: zoom-in;
}
body.quickview-alt-key ${s.embedVideo}:not(${s.imageContent}) * {
  pointer-events: none;
}
body.quickview-alt-key ${s.embedVideo}:not(${s.imageContent}):hover > ${s.embedVideoActions} {
  display: none;
}
body.quickview-alt-key :is(${s.wrapperPaused}, ${s.wrapperControlsHidden}) {
  cursor: zoom-in;
}
body.quickview-alt-key :is(${s.wrapperPaused}, ${s.wrapperControlsHidden}):hover > video {
  pointer-events: none;
}
body.quickview-alt-key :is(${s.wrapperPaused}, ${s.wrapperControlsHidden}):hover > div {
  display: none;
}`;
// QuickView/src/QuickView.plugin.tsx
const logError = (...err) => {
    console.error('[QuickView]', ...err);
};
// we keep a single LazyImageZoomable around and just change its props whenever
// we need to get it to trigger a specific image modal
let instance;
try {
    const ImageAttachment = getModule(m => m?.toString?.()?.includes?.('disableAltTextDisplay'), { searchExports: true });
    const LazyImageZoomable = getRenderedChildType(ImageAttachment, t => t.defaultProps?.autoPlay != null, { src: '' });
    if (!LazyImageZoomable) throw 'Could not find type as child of ImageAttachment -- I guess the structure must have changed.';
    instance = new(LazyImageZoomable.bind({ stateNode: {} }))({
        renderLinkComponent: p => React.createElement('a', p),
        src: ''
    });
} catch (e) {
    logError('Failed to create LazyImageZoomable instance :( ERROR:', e);
}
const openModal = (src, width, height, placeholder = src, animated = false) => {
    Object.assign(instance.props, { src, width, height, animated, shouldAnimate: true });
    instance.onZoom(new MouseEvent('click'), { placeholder });
};
const GUILDS_LIST = document.querySelector('ul[data-list-id="guildsnav"]');
const sizeImage = (src, new_size) => {
    const parsed = new URL(src, document.location.origin);
    if (parsed.host !== 'cdn.discordapp.com') return src;
    parsed.searchParams.set('size', `${new_size}`);
    return parsed.toString();
};
module.exports = class QuickView {
    start() {
        this.abort_controller = new AbortController();
        asyncCSS(this.abort_controller.signal, css, [
            [['avatarHoverTarget'], byProps('avatarHoverTarget')],
            [['hasBanner'], byProps('animatedContainer', 'hasBanner')],
            [['embedAuthorIcon'], byProps('embedAuthorIcon')],
            [['bannerImg'], byProps('bannerImg')],
            [{ avatar: 'chat_avatar' }, byProps('avatar', 'username', 'zalgo')],
            [{ avatar: 'users_avatar' }, byProps('avatar', 'clickable', 'subText', 'nameAndDecorators')],
            [{ avatar: 'dmlist_avatar' }, byProps('avatar', 'content', 'nameAndDecorators')],
            [{ blobContainer: 'server' }, byProps('blobContainer', 'pill')],
            [['reactionInner'], byProps('reactionInner')],
            [['peopleListItem'], byProps('peopleListItem')],
            [['roleIcon'], byProps('roleIcon', 'clickable')],
            [['imageContent'], byProps('imageContent', 'clickCTA')],
            [['listAvatar'], byProps('listName', 'listAvatar')],
            [['avatarWrapper'], byProps('background', 'avatarWrapper')],
            [['pointer'], byProps('cursorDefault', 'pointer')],
            [['activity'], byProps('activity', 'buttonColor')],
            [['userAvatar'], byProps('userAvatar', 'audienceIcon')],
            [['wrapperPaused', 'wrapperControlsHidden'], byProps('wrapperPaused')],
            [['embedVideo', 'embedVideoActions'], byProps('embedVideoActions')],
            [['gameIcon', 'screenshareIcon'], byProps('gameIcon', 'screenshareIcon')]
        ]);
        this.addPatches();
        GUILDS_LIST.addEventListener('click', this.guildsListListener);
        document.addEventListener('mousemove', this.trackAltKey);
        document.addEventListener('keydown', this.trackAltKey);
        document.addEventListener('keyup', this.trackAltKey);
    }
    trackAltKey(e) {
        if (e.altKey) {
            document.body.classList.add('quickview-alt-key');
        } else {
            document.body.classList.remove('quickview-alt-key');
        }
    }
    addPatches() {
        const { signal } = this.abort_controller;
        // Quickview Targets
        // [X] Modal Banner
        // [X] Modal Avatar
        // [X] Popout Banner
        // [X] Popout Avatar
        // [X] Server Banner
        // [X] Server Icon
        // [X] Chat Avatar
        // [X] DM List Avatar
        // [X] User List Avatar (FIXED)
        // [X] Embed Author
        // [X] Emoji
        // [X] Reaction
        // [X] Friends List Avatar
        // [X] Role Icons
        // [X] Video Thumbnails
        // [X] Mutual Server Icon
        // [X] Mutual Friend Avatar
        // [X] Group VC Avatar
        // [X] Channel List VC Avatar
        // [X] Popout Non-Server Avatar
        // [X] Modal Server Avatar
        // [X] Modal Rich Presence Image
        // [X] Popout Rich Presence Image
        waitForModule(ChannelListHeaderFilter, { signal })
            .then(ChannelListHeader => {
                if (!ChannelListHeader) return;
                Patcher.after(ChannelListHeader, 'type', (that, [props]) => {
                    try {
                        // SERVER BANNERS
                        if (!props.bannerVisible) return;
                        const owner = (props.children[0] ?? props.children)._owner;
                        if (!owner) return;
                        const banner_container_el = walkTree(owner, e => e.stateNode && e.memoizedProps?.className?.startsWith('animatedContainer'), ['child', 'sibling'])?.stateNode;
                        if (banner_container_el && !banner_container_el.quickview_patched) {
                            banner_container_el.addEventListener('click', e => {
                                const img = e.target;
                                if (!img) return;
                                const banner_url = img.currentSrc;
                                if (!banner_url) return;
                                // ^ user clicked in the margin between the banner image element and the server name
                                // in this case we just exit out gracefully and don't stop propagation.
                                e.stopPropagation();
                                openModal(sizeImage(banner_url, 4096), img.naturalWidth, img.naturalHeight, banner_url);
                            });
                            banner_container_el.quickview_patched = true;
                        }
                    } catch (e) {
                        logError('Error during guild banner patch:', e);
                    }
                });
            });
        waitForModule(AvatarFilter, { signal, defaultExport: false })
            .then(AvatarModule => {
                if (!AvatarModule) return;
                const key = getKey(AvatarModule, AvatarFilter);
                if (!key) {
                    logError("Wtf... can't find key for default in avatar module...", AvatarModule);
                    return;
                }
                const memo_key = getKey(AvatarModule, byProps('compare', 'type'));
                const patch = (that, [props]) => {
                    try {
                        // AVATARS
                        const avatar_url = props.src;
                        if (!avatar_url) return;
                        const is_popout = !(('className' in props)) || ('statusBackdropColor' in props);
                        const o_onClick = props.onClick?.bind(props) ?? (() => {});
                        props.onClick = e => {
                            if (is_popout && !e.altKey) return o_onClick(e);
                            if (e.target !== e.currentTarget) return o_onClick(e);
                            e.stopPropagation();
                            e.preventDefault();
                            openModal(sizeImage(avatar_url, 4096), 4096, 4096, avatar_url);
                        };
                    } catch (e) {
                        logError('Error during user avatar patch:', e);
                    }
                };
                Patcher.before(AvatarModule, key, patch);
                if (memo_key) {
                    Patcher.before(AvatarModule[memo_key], 'type', patch);
                } else {
                    logError("Can't find key for decorated avatar in avatar module D: ...", AvatarModule);
                }
            });
        waitForModule(ListAvatarFilter, { signal })
            .then(ListAvatar => {
                if (!ListAvatar) return;
                Patcher.before(ListAvatar.prototype, 'render', that => {
                    try {
                        // MUTUAL SERVER/FRIEND ICONS
                        const { props } = that;
                        const icon_url = props.guild?.getIconURL?.(props.size);
                        if (!icon_url) return;
                        const o_onClick = props.onClick?.bind(props) ?? (() => {});
                        props.onClick = e => {
                            if (!e.altKey) return o_onClick(e);
                            e.stopPropagation();
                            e.preventDefault();
                            openModal(sizeImage(icon_url, 4096), 4096, 4096, icon_url);
                        };
                    } catch (e) {
                        logError('Error during mutual server icon patch:', e);
                    }
                });
            });
        waitForModule(EXPORTS_RichPresenceFilter, { signal, searchExports: true })
            .then(RichPresence => {
                if (!RichPresence) return;
                Patcher.after(RichPresence.prototype, 'render', (that, _, ret) => {
                    try {
                        // RICH PRESENCE IMAGES
                        if (!ret) return;
                        const { props } = ret;
                        props.onClick = e => {
                            const img_url = (el => {
                                if (el instanceof HTMLImageElement) return el.currentSrc;
                                if (el.style?.backgroundImage) return el.style.backgroundImage.slice(5, -2);
                            })(e.target);
                            if (!img_url) return;
                            e.stopPropagation();
                            e.preventDefault();
                            openModal(sizeImage(img_url, 4096), 4096, 4096, img_url);
                        };
                    } catch (e) {
                        logError('Error during rich presence patch:', e);
                    }
                });
            });
        waitForModule(VoiceCallAvatarFilter, { signal })
            .then(VoiceCallAvatar => {
                if (!VoiceCallAvatar) return;
                Patcher.after(VoiceCallAvatar.prototype, 'renderVoiceCallAvatar', (that, _, ret) => {
                    try {
                        // VOICE CALL AVATARS
                        const { props } = that;
                        const avatar_url = props.src;
                        if (!avatar_url) return;
                        ret.props.onClick = e => {
                            openModal(sizeImage(avatar_url, 4096), 4096, 4096, avatar_url);
                        };
                    } catch (e) {
                        logError('Error during voice call avatar patch:', e);
                    }
                });
            });
        waitForModule(BannerFilter, { signal, defaultExport: false })
            .then(BannerModule => {
                if (!BannerModule) return;
                const key = getKey(BannerModule, BannerFilter);
                if (!key) {
                    logError("Wtf... can't find key for default in banner module...", BannerModule);
                    return;
                }
                Patcher.before(BannerModule, key, (that, [props]) => {
                    try {
                        // BANNERS
                        if (!props.hasBannerImage) return;
                        const banner_props = props.children.props;
                        const banner_url = banner_props.style.backgroundImage.slice(4, -1);
                        const o_onClick = banner_props.onClick?.bind(banner_props) ?? (() => {});
                        banner_props.onClick = e => {
                            if (e.target !== e.currentTarget) return o_onClick(e);
                            e.stopPropagation();
                            e.preventDefault();
                            openModal(sizeImage(banner_url, 4096), 4096, 1638, banner_url);
                        };
                    } catch (e) {
                        logError('Error during user banner patch:', e);
                    }
                });
            });
        waitForModule(PopoutHandlerFilter, { signal })
            .then(PopoutHandler => {
                if (!PopoutHandler) return;
                Patcher.after(PopoutHandler.prototype, 'render', that => {
                    try {
                        const message_contents_el = walkTree(that._reactInternals, e => e?.memoizedProps?.className?.startsWith?.('contents-'), ['return'])?.stateNode;
                        if (message_contents_el) {
                            try {
                                // CHAT AVATARS
                                const img = message_contents_el.firstElementChild;
                                if (!img) return;
                                const avatar_url = img.currentSrc;
                                if (!avatar_url) return;
                                img.addEventListener('click', e => {
                                    if (!e.altKey) return;
                                    const src = img.currentSrc || avatar_url;
                                    // ^^^ img.currentSrc may sometimes be an empty string when gif avatars are slow to load.
                                    // Fall back to original URL under such circumstances.
                                    e.stopPropagation();
                                    e.preventDefault();
                                    openModal(sizeImage(src, 4096), 4096, 4096, avatar_url);
                                });
                            } catch (e) {
                                logError('Error during chat avatar patch:', e);
                            }
                            try {
                                // ROLE ICONS
                                const img = message_contents_el.querySelector('img[class^="roleIcon"]');
                                if (!img) return;
                                const icon_url = img.currentSrc;
                                if (!icon_url) return;
                                img.addEventListener('click', e => {
                                    if (!e.altKey) return;
                                    e.stopPropagation();
                                    e.preventDefault();
                                    openModal(sizeImage(icon_url, 4096), img.naturalWidth, img.naturalHeight, icon_url);
                                });
                            } catch (e) {
                                logError('Error during role icon patch:', e);
                            }
                            return;
                        }
                        const avatar_el = walkTree(that._reactInternals, e => e?.memoizedProps?.className?.includes?.('avatar-'), ['child', 'sibling'])?.stateNode;
                        if (avatar_el) {
                            try {
                                const avatar_url = avatar_el.style.backgroundImage.slice(5, -2);
                                if (!avatar_url) return;
                                avatar_el.addEventListener('click', e => {
                                    if (!e.altKey) return;
                                    e.stopPropagation();
                                    e.preventDefault();
                                    openModal(sizeImage(avatar_url, 4096), 4096, 4096, avatar_url);
                                });
                            } catch (e) {
                                logError('Error during voice avatar patch:', e);
                            }
                        }
                    } catch (e) {
                        logError('Error during popout handler render patch:', e);
                    }
                });
            });
        waitForModule(EmbedFilter, { signal })
            .then(Embed => {
                if (!Embed) return;
                Patcher.after(Embed.prototype, 'renderAuthor', (that, args, ret) => {
                    if (!ret) return;
                    try {
                        // EMBED AUTHOR ICON
                        return BdApi.React.createElement('span', {
                            onClick: e => {
                                try {
                                    const img = e.target;
                                    if (!(img instanceof HTMLImageElement)) return;
                                    const icon_url = img.currentSrc;
                                    if (!icon_url) return;
                                    e.stopPropagation();
                                    e.preventDefault();
                                    openModal(sizeImage(icon_url, 4096), img.naturalWidth, img.naturalHeight, icon_url);
                                } catch (e2) {
                                    logError('Error during embed author click listener:', e2);
                                }
                            }
                        }, ret);
                    } catch (e) {
                        logError('Error during embed author patch:', e);
                    }
                });
                Patcher.after(Embed.prototype, 'renderVideo', (that, [render_props], ret) => {
                    if (!that || !ret) return;
                    if (render_props.gifv) return;
                    try {
                        // EMBED VIDEO
                        const { props } = that;
                        const thumbnail = props?.embed?.thumbnail;
                        if (!thumbnail) return;
                        const thumb_url = thumbnail.proxyURL;
                        if (!thumb_url) return;
                        return BdApi.React.createElement('span', {
                            onClick: e => {
                                try {
                                    if (!e.altKey) return;
                                    e.stopPropagation();
                                    e.preventDefault();
                                    openModal(thumb_url, thumbnail.width, thumbnail.height, thumb_url);
                                } catch (e2) {
                                    logError('Error during embed video click listener:', e2);
                                }
                            }
                        }, ret);
                    } catch (e) {
                        logError('Error during embed video patch:', e);
                    }
                });
            });
        waitForModule(EmojiFilter, { signal })
            .then(EmojiWrapper => {
                if (!EmojiWrapper) return;
                const Emoji = getRenderedChildType(EmojiWrapper, t => t.prototype?.render);
                if (!Emoji) {
                    logError(`Can't find Emoji in EmojiWrapper -- structure must have changed, maybe it's a Function component now :(`);
                    return;
                }
                Patcher.before(Emoji.prototype, 'render', that => {
                    try {
                        // EMOJIS
                        Patcher.after(that.props, 'onClick', (_, [e]) => {
                            try {
                                if (!e.altKey) return;
                                const img = e.target;
                                const emoji_url = img.currentSrc;
                                if (!emoji_url) throw 'Error getting image source';
                                e.stopPropagation();
                                e.preventDefault();
                                openModal(sizeImage(emoji_url, 4096), img.naturalWidth, img.naturalHeight, emoji_url);
                            } catch (e2) {
                                logError('Error during emoji click listener:', e2);
                            }
                        });
                    } catch (e) {
                        logError('Error during emoji patch:', e);
                    }
                });
            });
        waitForModule(FriendsListAvatarFilter, { signal })
            .then(FriendsListAvatar => {
                if (!FriendsListAvatar) return;
                Patcher.after(FriendsListAvatar, 'type', (that, _, ret) => {
                    try {
                        // FRIENDS LIST AVATARS
                        const { props } = ret;
                        const o_onClick = props.onClick?.bind(props) ?? (() => {});
                        props.onClick = e => {
                            try {
                                if (!e.altKey) return o_onClick(e);
                                const img = walkTree(e.target, e2 => e2 instanceof HTMLImageElement, ['firstElementChild']);
                                if (!img) return o_onClick(e);
                                const avatar_url = img.currentSrc;
                                if (!avatar_url) throw 'Error getting image source';
                                e.stopPropagation();
                                e.preventDefault();
                                openModal(sizeImage(avatar_url, 4096), 4096, 4096, avatar_url);
                                return;
                            } catch (e2) {
                                logError('Error during friends list avatar click listener:', e2);
                            }
                            return o_onClick(e);
                        };
                    } catch (e) {
                        logError('Error during friends list avatar patch:', e);
                    }
                });
            });
        waitForModule(MediaPlayerFilter, { signal })
            .then(MediaPlayer => {
                if (!MediaPlayer) return;
                Patcher.after(MediaPlayer.prototype, 'render', (that, _, ret) => {
                    if (!that || !ret) return;
                    try {
                        // VIDEO UPLOAD
                        const { props } = that;
                        const thumb_url = props.poster;
                        if (!thumb_url) return;
                        return BdApi.React.createElement('span', {
                            onClick: e => {
                                try {
                                    if (!e.altKey) return;
                                    e.stopPropagation();
                                    e.preventDefault();
                                    openModal(thumb_url, props.naturalWidth, props.naturalHeight, thumb_url);
                                } catch (e2) {
                                    logError('Error during media player click listener:', e2);
                                }
                            }
                        }, ret);
                    } catch (e) {
                        logError('Error during media player patch:', e);
                    }
                });
            });
    }
    guildsListListener(e) {
        if (!e.altKey) return;
        try {
            const target = e.target;
            const img = target.firstElementChild;
            const icon_url = img.currentSrc;
            if (!icon_url) return;
            // ^^ validate our assumptions that we actually did click a server icon.
            e.stopPropagation();
            openModal(sizeImage(icon_url, 4096), 4096, 4096, icon_url);
        } catch (e2) {
            logError('Error during guild click listener', e2);
        }
    }
    stop() {
        DOM.removeStyle();
        this.abort_controller?.abort();
        Patcher.unpatchAll();
        GUILDS_LIST.removeEventListener('click', this.guildsListListener);
        document.removeEventListener('mousemove', this.trackAltKey);
        document.removeEventListener('keydown', this.trackAltKey);
        document.removeEventListener('keyup', this.trackAltKey);
    }
};