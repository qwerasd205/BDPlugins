/**
 * @name QuickView
 * @author Qwerasd
 * @description View avatars, icons, banners, thumbnails, and emojis with alt + click.
 * @version 1.0.1
 * @authorId 140188899585687552
 * @updateUrl https://betterdiscord.app/gh-redirect?id=644
 */

import type { Fiber } from 'react-reconciler';

const { Patcher, Webpack: { getModule, waitForModule, Filters: { byProps } }} = BdApi;

const logError = (...err) => {
    console.error('[QuickView]', ...err);
}

type ObjKey = string | number | symbol;

const walkTree = <T extends {}>(
    elem: T,
    filter: (o: any) => boolean,
    keys: ObjKey[] = ['child', 'alternate', 'sibling', 'return'],
    seen = new WeakSet<object>()
): any => {
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

type Component = React.FunctionComponent | React.ComponentClass;

const getRenderedChildType = (c: Component, f: (c: any) => boolean, props = {}): Component | false => {
    // Create a temporary root to render our parent component in.
    const root = document.createElement('div') as (HTMLDivElement & { __reactContainer$: Fiber });

    // Create an instance of the component and render it in our root.
    BdApi.ReactDOM.render(BdApi.React.createElement(c, props), root);

    // Grab the internal fiber from the root;
    const fiber = root.__reactContainer$;

    // Walk the tree from the fiber until we find a type matching our filter `f`
    const result = walkTree(fiber, e => e.type && (typeof e.type !== 'string') && f(e.type));

    // ! Clean up the React DOM now that we have what we need ! //
    BdApi.ReactDOM.unmountComponentAtNode(root);

    return result && result.type;
}

// we keep a single LazyImageZoomable around and just change its props whenever
// we need to get it to trigger a specific image modal
let instance;
try {
    const ImageAttachment = getModule(m => m?.toString?.()?.includes?.('disableAltTextDisplay'));

    const LazyImageZoomable = getRenderedChildType(ImageAttachment, t => t.defaultProps?.autoPlay != null, {src: ''});

    if (!LazyImageZoomable) throw 'Could not find type as child of ImageAttachment -- I guess the structure must have changed.';

    instance = new (
        LazyImageZoomable.bind({stateNode: {}})
    )({
        renderLinkComponent: p => BdApi.React.createElement('a', p),
        src: ''
    });
} catch (e) {
    logError('Failed to create LazyImageZoomable instance :( ERROR:', e);
}

const openModal = (src: string, width: number, height: number, placeholder = src, animated = false) => {
    Object.assign(instance.props, {
        src, width, height, animated, shouldAnimate: true
    });
    instance.onZoom(new MouseEvent('click'), {placeholder});
}

const { avatarHoverTarget }     = getModule(byProps('avatarHoverTarget'));
const { hasBanner }             = getModule(byProps('animatedContainer', 'hasBanner'));
const { embedAuthorIcon }       = getModule(byProps('embedAuthorIcon'));
const { bannerImg }             = getModule(byProps('bannerImg'));
const { avatar: dmlist_avatar } = getModule(byProps('avatar', 'nameAndDecorators'));
const { avatar: chat_avatar }   = getModule(byProps('avatar', 'username', 'zalgo'));
const { blobContainer: server } = getModule(byProps('blobContainer', 'pill'));
const { reactionInner }         = getModule(byProps('reactionInner'));
const { peopleListItem }        = getModule(byProps('peopleListItem'));
const { roleIcon }              = getModule(byProps('roleIcon', 'clickable'));
const { imageContent }          = getModule(byProps('imageContent', 'clickCTA'));
const { emojiContainer }        = getModule(m => m.emojiContainer && Object.keys(m).length === 1);
const { wrapperPaused, wrapperControlsHidden } = getModule(byProps('wrapperPaused'));
const { embedVideo, embedVideoActions }        = getModule(byProps('embedVideoActions'));

const FILTERS = {
    ChannelListHeader:   m => m?.type?.toString?.()?.includes?.('hasCommunityInfoSubheader'),
    PrivateChannelRoute: m => m?.render?.toString?.()?.includes?.('"innerRef"'),
    PopoutHandler:       m => m?.Align && m.Positions && m.contextType && m.defaultProps?.autoInvert != null,
    Embed:               m => m?.prototype?.renderAuthor && m.prototype.renderMedia,
    Emoji:               m => m?.toString?.()?.includes?.('autoplay,reduceMotion:'),
    FriendsListAvatar:   m => m?.type?.toString?.()?.includes?.('["user","size","animate","aria-hidden"]'),
    MediaPlayer:         m => m?.prototype?.render?.toString?.()?.includes?.('"mediaPlayerClassName","poster"'),
};

const GUILDS_LIST = document.querySelector('ul[data-list-id="guildsnav"]');

export = class QuickView {
    
    abort_controller: AbortController;

    start() {
        // classname -> selector (e.g. "foo bar" -> ".foo.bar")
        const s = (className: string) => '.' + className?.split(' ').join('.');

        BdApi.injectCSS('QuickView', /*CSS*/`
            ${s(hasBanner)} { z-index: 10; }

            [class*="avatar"] rect { pointer-events: none; }

            header [role="img"][class*="avatar"] { cursor: zoom-in; }
            [class*="bannerPremium"]             { cursor: zoom-in; }
            ${s(embedAuthorIcon)}                { cursor: zoom-in; }
            ${s(bannerImg)}                      { cursor: zoom-in; }
            
            body.quickview-alt-key ${s(chat_avatar)}         { cursor: zoom-in; }
            body.quickview-alt-key ${s(avatarHoverTarget)}   { cursor: zoom-in; }
            body.quickview-alt-key ${s(server)} div          { cursor: zoom-in; }
            body.quickview-alt-key ${s(dmlist_avatar)}       { cursor: zoom-in; }
            body.quickview-alt-key ${s(dmlist_avatar)} > div { cursor: zoom-in; }
            body.quickview-alt-key ${s(roleIcon)}            { cursor: zoom-in; }

            body.quickview-alt-key ${s(embedVideo)}                                                       { cursor: zoom-in; }
            body.quickview-alt-key ${s(embedVideo)}:not(${s(imageContent)}) *                        { pointer-events: none; }
            body.quickview-alt-key ${s(embedVideo)}:not(${s(imageContent)}):hover > ${s(embedVideoActions)} { display: none; }

            body.quickview-alt-key :is(${s(wrapperPaused)},${s(wrapperControlsHidden)})                    { cursor: zoom-in; }
            body.quickview-alt-key :is(${s(wrapperPaused)},${s(wrapperControlsHidden)}):hover > video { pointer-events: none; }
            body.quickview-alt-key :is(${s(wrapperPaused)},${s(wrapperControlsHidden)}):hover > div          { display: none; }
            
            body.quickview-alt-key ${s(peopleListItem)} div[class*="avatar"] { cursor: zoom-in; }

            body.quickview-alt-key :is(${s(emojiContainer)}, ${s(reactionInner)}) img { cursor: zoom-in; }
        `);
        this.addPatches();
        GUILDS_LIST.addEventListener('click', this.guildsListListener);
        document.addEventListener('mousemove', this.trackAltKey);
        document.addEventListener('keydown', this.trackAltKey);
        document.addEventListener('keyup', this.trackAltKey);
    }

    trackAltKey (e: MouseEvent | KeyboardEvent) {
        if (e.altKey) {
            document.body.classList.add('quickview-alt-key');
        } else {
            document.body.classList.remove('quickview-alt-key');
        }
    }

    addPatches () {
        this.abort_controller = new AbortController();
        const { signal } = this.abort_controller;

        // TODO
        // [X] Modal Banner
        // [X] Modal Avatar
        // [X] Popout Banner
        // [X] Popout Avatar
        // [X] Server Banner
        // [X] Server Icon
        // [X] Chat Avatar
        // [X] DM List Avatar
        // [X] User List Avatar
        // [X] Embed Author
        // [X] Emoji
        // [X] Reaction
        // [X] Friends List Avatar (NEW)
        // [X] Role Icons          (NEW)
        // [X] Video Thumbnails    (NEW)

        Patcher.before('QuickView', BdApi.ReactDOM, 'createPortal', (that, [elem]) => {
            if (elem == null) return;

            const owner = elem._owner;

            if (!owner) return;

            const is_modal = owner.stateNode?.props && ('modalKey' in owner.stateNode.props);
            
            try { // POPOUT/MODAL BANNERS
                const banner = walkTree(owner, e => e.memoizedProps?.hasBannerImage, ['child', 'sibling']);
                if (banner) {
                    const banner_el = walkTree(banner, e => e.memoizedProps?.style?.backgroundImage, ['child', 'sibling'])?.stateNode;
                    if (banner_el && !banner_el.quickview_patched) {
                        const banner_url = banner_el.style.backgroundImage.slice(5, -2);
                        banner_el.addEventListener('click', (e: MouseEvent) => {
                            if (e.target !== banner_el) return;
                            openModal(
                                banner_url.slice(0, banner_url.indexOf('?')) + '?size=4096',
                                4096, 1638,
                                banner_url
                            );
                        });
                        banner_el.quickview_patched = true;
                    }
                }
            } catch (e) {
                logError('Error during banner patch:', e);
            }

            try { // POPOUT/MODAL AVATARS
                const avatar = walkTree(owner, e => (e.memoizedProps != null && typeof e.memoizedProps === 'object') && ('avatarDecoration' in e.memoizedProps), ['child', 'sibling']);
                if (avatar) {
                    const avatar_el = walkTree(avatar, e => e.memoizedProps?.style?.width, ['child'])?.stateNode;
                    if (avatar_el && !avatar_el.quickview_patched) {
                        const avatar_url = avatar.memoizedProps.src;
                        avatar_el.addEventListener('click', (e: MouseEvent) => {
                            if (!is_modal && !e.altKey) return;
                            e.stopPropagation();
                            openModal(
                                avatar_url.slice(0, avatar_url.indexOf('?')) + '?size=4096',
                                4096, 4096,
                                avatar_url
                            );
                        });
                        avatar_el.quickview_patched = true;
                    }
                }
            } catch (e) {
                logError('Error during avatar patch:', e);
            }
        });

        waitForModule(FILTERS.ChannelListHeader, {signal})
            .then(ChannelListHeader => {
                if (!ChannelListHeader) return;
                Patcher.after('QuickView', ChannelListHeader, 'type', (that, [props], ret) => {
                    try { // SERVER BANNERS
                        if (!props.bannerVisible) return;
        
                        const owner = (props.children[0] ?? props.children)._owner;
                        if (!owner) return;
        
                        const banner_container_el = walkTree(owner, e => e.stateNode && e.memoizedProps?.className?.startsWith('animatedContainer'), ['child', 'sibling'])?.stateNode;
        
                        if (banner_container_el && !banner_container_el.quickview_patched) {
                            banner_container_el.addEventListener('click', (e: MouseEvent) => {
                                const img = (e.target as HTMLImageElement);
                                if (!img) return;
                                const banner_url = img.currentSrc;
                                if (!banner_url) return;
                                // ^ user clicked in the margin between the banner image element and the server name
                                // in this case we just exit out gracefully and don't stop propagation.
                                e.stopPropagation();
                                openModal(
                                    banner_url.slice(0, banner_url.indexOf('?')) + '?size=4096',
                                    img.naturalWidth,
                                    img.naturalHeight,
                                    banner_url
                                );
                            });
                            banner_container_el.quickview_patched = true;
                        }
                    } catch (e) {
                        logError('Error during guild banner patch:', e);
                    }
                });
            });

        waitForModule(FILTERS.PrivateChannelRoute, {signal})
            .then(PrivateChannelRoute => {
                if (!PrivateChannelRoute) return;
                Patcher.before('QuickView', PrivateChannelRoute, 'render', (that, [props]) => {
                    try { // DMS LIST AVATARS
                        const o_onClick = props.onClick?.bind(props) ?? (() => {});
                        props.onClick = (e: React.MouseEvent) => {
                            try {
                                if (!e.altKey) return o_onClick(e);

                                const img = walkTree(e.target, e => e instanceof HTMLImageElement, ['firstElementChild']) as HTMLImageElement;
                                if (!img) return o_onClick(e);

                                const avatar_url = img.currentSrc;
                                
                                e.stopPropagation();
                                e.preventDefault();
                                openModal(
                                    img.currentSrc.slice(0, img.currentSrc.indexOf('?')) + '?size=4096',
                                    4096, 4096,
                                    avatar_url
                                );
                                return;
                            } catch (e) {
                                logError('Error during DM channel click listener:', e);
                            }
                            return o_onClick(e)
                        }
                    } catch (e) {
                        logError('Error during DM channel patch:', e);
                    }
                });
            });

        waitForModule(FILTERS.PopoutHandler, {signal})
            .then(PopoutHandler => {
                if (!PopoutHandler) return;
                Patcher.before('QuickView', PopoutHandler.prototype, 'render', (that) => {
                    try {
                        const message_contents_el = walkTree(that._reactInternals, e => e?.memoizedProps?.className?.startsWith?.('contents-'), ['return'])?.stateNode;
                        if (message_contents_el) {
                            try { // CHAT AVATARS
                                const img = message_contents_el.firstElementChild as HTMLImageElement;
                                if (!img) return;
                                const avatar_url = img.currentSrc;
                                if (!avatar_url) return;

                                img.addEventListener('click', (e: MouseEvent) => {
                                    if (!e.altKey) return;

                                    e.stopPropagation();
                                    e.preventDefault();
                                    openModal(
                                        img.currentSrc.slice(0, img.currentSrc.indexOf('?')) + '?size=4096',
                                        4096, 4096,
                                        avatar_url
                                    );
                                });
                            } catch (e) {
                                logError('Error during chat avatar patch:', e);
                            }

                            try { // ROLE ICONS
                                const img = message_contents_el.querySelector('h2 img') as HTMLImageElement;
                                if (!img) return;
                                const icon_url = img.currentSrc;
                                if (!icon_url) return;

                                const question_idx = icon_url.indexOf('?');
                                const full_size    = question_idx !== -1 ? icon_url.slice(0, icon_url.indexOf('?')) + '?size=4096' : icon_url;

                                img.addEventListener('click', (e: MouseEvent) => {
                                    if (!e.altKey) return;

                                    e.stopPropagation();
                                    e.preventDefault();
                                    openModal(
                                        full_size,
                                        img.naturalWidth,
                                        img.naturalHeight,
                                        icon_url
                                    );
                                });
                            } catch (e) {
                                logError('Error during role icon patch:', e);
                            }
                            return;
                        }

                        // TODO: Figure out why this doesn't work first try (opens popout, then works after that).
                        const { domElementRef: { current: dom_node } } = that;
                        if (dom_node) { // GENERIC / MEMBER LIST AVATARS
                            const avatar_wrapper_el = (dom_node as HTMLElement).querySelector('[class^="avatar-"]') as HTMLElement;
                            if (!avatar_wrapper_el) return;

                            const img = avatar_wrapper_el.querySelector('img[class^="avatar-"]') as HTMLImageElement;
                            if (!img) return;
                            const avatar_url = img.currentSrc;
                            if (!avatar_url) return;

                            avatar_wrapper_el.addEventListener('click', (e: MouseEvent) => {
                                if (!e.altKey) return;

                                e.stopPropagation();
                                e.preventDefault();
                                openModal(
                                    avatar_url.slice(0, avatar_url.indexOf('?')) + '?size=4096',
                                    4096, 4096,
                                    avatar_url
                                );
                            });
                            return;
                        }
                    } catch (e) {
                        logError('Error during popout handler patch:', e);
                    }
                });
            });
        
        waitForModule(FILTERS.Embed, {signal})
            .then(Embed => {
                if (!Embed) return;
                Patcher.after('QuickView', Embed.prototype, 'renderAuthor', (that, args, ret) => {
                    if (!ret) return;
                    
                    try { // EMBED AUTHOR ICON
                        return (<span onClick={(e: React.MouseEvent) => {
                            try {
                                const img = e.target as HTMLImageElement;
                                if (!(img instanceof HTMLImageElement)) return;
                                
                                const icon_url = img.currentSrc;
                                if (!icon_url) return;

                                e.stopPropagation();
                                e.preventDefault();
                                openModal(
                                    icon_url,
                                    img.naturalWidth,
                                    img.naturalHeight,
                                    icon_url
                                );
                            } catch (e) {
                                logError('Error during embed author click listener:', e);
                            }
                        }}>{ret}</span>);
                    } catch (e) {
                        logError('Error during embed author patch:', e);
                    }
                });

                Patcher.after('QuickView', Embed.prototype, 'renderVideo', (that, [render_props], ret) => {
                    if (!that || !ret) return;

                    if (render_props.gifv) return;

                    try { // EMBED VIDEO
                        const { props } = that;
                        
                        const thumbnail = props?.embed?.thumbnail;
                        if (!thumbnail) return;

                        const thumb_url = thumbnail.proxyUrl;
                        if (!thumb_url) return;

                        return (<span onClick={(e: React.MouseEvent) => {
                            try {
                                if (!e.altKey) return;

                                e.stopPropagation();
                                e.preventDefault();
                                openModal(
                                    thumb_url,
                                    thumbnail.width,
                                    thumbnail.height,
                                    thumb_url
                                );
                            } catch (e) {
                                logError('Error during embed video click listener:', e);
                            }
                        }}>{ret}</span>);
                    } catch (e) {
                        logError('Error during embed video patch:', e);
                    }
                });
            });

        waitForModule(FILTERS.Emoji, {signal})
            .then(EmojiWrapper => {
                if (!EmojiWrapper) return;

                const Emoji = getRenderedChildType(EmojiWrapper, t => t.prototype?.render);

                if (!Emoji) {
                    logError(`Can't find Emoji in EmojiWrapper -- structure must have changed, maybe it's a Function component now :(`);
                    return;
                }

                Patcher.before('QuickView', Emoji.prototype, 'render', (that) => {
                    try { // EMOJIS
                        Patcher.after('QuickView', that.props, 'onClick', (_, [e]: [React.MouseEvent]) => {
                            try {
                                if (!e.altKey) return;

                                const img = e.target as HTMLImageElement;
                                const emoji_url = img.currentSrc;
                                if (!emoji_url) return;

                                const question_idx = emoji_url.indexOf('?');
                                const full_size    = question_idx !== -1 ? emoji_url.slice(0, emoji_url.indexOf('?')) + '?size=4096' : emoji_url;

                                e.stopPropagation();
                                e.preventDefault();
                                openModal(
                                    full_size,
                                    img.naturalWidth,
                                    img.naturalHeight,
                                    emoji_url
                                );
                            } catch (e) {
                                logError('Error during emoji click listener:', e);
                            }
                        });
                    } catch (e) {
                        logError('Error during emoji patch:', e);
                    }
                });
            });

        
        waitForModule(FILTERS.FriendsListAvatar, {signal})
            .then(FriendsListAvatar => {
                if (!FriendsListAvatar) return;
                Patcher.after('QuickView', FriendsListAvatar, 'type', (that, _, ret) => {
                    try { // FRIENDS LIST AVATARS
                        const { props } = ret;
                        const o_onClick = props.onClick?.bind(props) ?? (() => {});
                        props.onClick = (e: React.MouseEvent) => {
                            try {
                                if (!e.altKey) return o_onClick(e);

                                const img = walkTree(e.target, e => e instanceof HTMLImageElement, ['firstElementChild']) as HTMLImageElement;
                                if (!img) return o_onClick(e);

                                const avatar_url = img.currentSrc;
                                
                                e.stopPropagation();
                                e.preventDefault();
                                openModal(
                                    avatar_url.slice(0, avatar_url.indexOf('?')) + '?size=4096',
                                    4096, 4096,
                                    avatar_url
                                );
                                return;
                            } catch (e) {
                                logError('Error during friends list avatar click listener:', e);
                            }
                            return o_onClick(e)
                        }
                    } catch (e) {
                        logError('Error during friends list avatar patch:', e);
                    }
                });
            });

        waitForModule(FILTERS.MediaPlayer, {signal})
            .then((MediaPlayer) => {
                if (!MediaPlayer) return;

                Patcher.after('QuickView', MediaPlayer.prototype, 'render', (that, _, ret) => {
                    if(!that || !ret) return;

                    try { // VIDEO UPLOAD
                        const { props } = that;

                        const thumb_url = props.poster;
                        if (!thumb_url) return;

                        return (<span onClick={(e: React.MouseEvent) => {
                            try {
                                if (!e.altKey) return;

                                e.stopPropagation();
                                e.preventDefault();
                                openModal(
                                    thumb_url,
                                    props.naturalWidth,
                                    props.naturalHeight,
                                    thumb_url
                                );
                            } catch (e) {
                                logError('Error during media player click listener:', e);
                            }
                        }}>{ret}</span>);
                    } catch (e) {
                        logError('Error during media player patch:', e);
                    }
                });
            });
    }

    guildsListListener (e: MouseEvent) {
        if (!e.altKey) return;

        try {
            const target   = e.target as HTMLDivElement;
            const img      = target.firstElementChild as HTMLImageElement;
            const icon_url = img.currentSrc;

            if (!icon_url) return;
            // ^^ validate our assumptions that we actually did click a server icon.

            e.stopPropagation();
            openModal(
                icon_url.slice(0, icon_url.indexOf('?')) + '?size=4096',
                4096, 4096,
                icon_url
            );
        } catch (e) {
            logError('Error during guild click listener', e);
        }
    }

    stop() {
        BdApi.clearCSS('QuickView');
        this.abort_controller?.abort();
        Patcher.unpatchAll('QuickView');
        GUILDS_LIST.removeEventListener('click', this.guildsListListener);
        document.removeEventListener('mousemove', this.trackAltKey);
        document.removeEventListener('keydown', this.trackAltKey);
        document.removeEventListener('keyup', this.trackAltKey);
    }
}
