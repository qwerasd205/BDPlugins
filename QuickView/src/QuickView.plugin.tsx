/**
 * @name QuickView
 * @author Qwerasd
 * @description View avatars, icons, banners, thumbnails, and emojis with alt + click.
 * @version 1.1.1
 * @authorId 140188899585687552
 * @updateUrl https://betterdiscord.app/gh-redirect?id=644
 */

import { React, Patcher, getModule, waitForModule, byProps, DOM } from 'utils/BdApi';

import { walkTree, getKey } from 'utils/utils';
import { getRenderedChildType } from 'utils/react';

import {
    ChannelListHeaderFilter,
    FriendsListAvatarFilter,
    VoiceCallAvatarFilter,
    PopoutHandlerFilter,
    MediaPlayerFilter,
    ListAvatarFilter,
    AvatarFilter,
    BannerFilter,
    EmbedFilter,
    EmojiFilter,

    EXPORTS_RichPresenceFilter
} from 'utils/modules/filters';

import { asyncCSS } from 'utils/css';
import { css } from './style.scss';

const logError = (...err) => {
    console.error('[QuickView]', ...err);
}

// we keep a single LazyImageZoomable around and just change its props whenever
// we need to get it to trigger a specific image modal
let instance;
try {
    const ImageAttachment = getModule(m => m?.toString?.()?.includes?.('disableAltTextDisplay'), { searchExports: true });

    const LazyImageZoomable = getRenderedChildType(ImageAttachment, t => t.defaultProps?.autoPlay != null, {src: ''});

    if (!LazyImageZoomable) throw 'Could not find type as child of ImageAttachment -- I guess the structure must have changed.';

    instance = new (
        LazyImageZoomable.bind({stateNode: {}})
    )({
        renderLinkComponent: p => React.createElement('a', p),
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

const GUILDS_LIST = document.querySelector('ul[data-list-id="guildsnav"]');

const sizeImage = (src: string, new_size: number): string => {
    const parsed = new URL(src, document.location.origin);

    if (parsed.host !== 'cdn.discordapp.com') return src;

    parsed.searchParams.set('size', `${new_size}`);

    return parsed.toString();
}

export = class QuickView {
    
    abort_controller: AbortController;

    start() {
        this.abort_controller = new AbortController();

        asyncCSS(this.abort_controller.signal, css, [
            [['avatarHoverTarget'        ], byProps('avatarHoverTarget')],
            [['hasBanner'                ], byProps('animatedContainer', 'hasBanner')],
            [['embedAuthorIcon'          ], byProps('embedAuthorIcon')],
            [['bannerImg'                ], byProps('bannerImg')],
            [{avatar: 'chat_avatar'      }, byProps('avatar', 'username', 'zalgo')],
            [{avatar: 'users_avatar'     }, byProps('avatar', 'clickable', 'subText', 'nameAndDecorators')],
            [{avatar: 'dmlist_avatar'    }, byProps('avatar', 'content', 'nameAndDecorators')],
            [{blobContainer: 'server'    }, byProps('blobContainer', 'pill')],
            [['reactionInner'            ], byProps('reactionInner')],
            [['peopleListItem'           ], byProps('peopleListItem')],
            [['roleIcon'                 ], byProps('roleIcon', 'clickable')],
            [['imageContent'             ], byProps('imageContent', 'clickCTA')],
            [['listAvatar'               ], byProps('listName', 'listAvatar')],
            [['avatarWrapper'            ], byProps('background', 'avatarWrapper')],
            [['pointer'                  ], byProps('cursorDefault', 'pointer')],
            [['activity'                 ], byProps('activity', 'buttonColor')],
            [['userAvatar'               ], byProps('userAvatar', 'audienceIcon')],
            [['wrapperPaused', 'wrapperControlsHidden'], byProps('wrapperPaused')],
            [['embedVideo', 'embedVideoActions'       ], byProps('embedVideoActions')],
            [['gameIcon', 'screenshareIcon'           ], byProps('gameIcon', 'screenshareIcon')],
        ]);
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

        waitForModule(ChannelListHeaderFilter, {signal})
            .then(ChannelListHeader => {
                if (!ChannelListHeader) return;
                Patcher.after(ChannelListHeader, 'type', (that, [props]) => {
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
                                    sizeImage(banner_url, 4096),
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
                    try { // AVATARS
                        const avatar_url = props.src;
                        if (!avatar_url) return;

                        const is_popout = !('className' in props) || ('statusBackdropColor' in props);
                        
                        const o_onClick = props.onClick?.bind(props) ?? (() => {});
                        props.onClick = (e: React.MouseEvent) => {
                            if (is_popout && !e.altKey) return o_onClick(e);
                            if (e.target !== e.currentTarget) return o_onClick(e);

                            e.stopPropagation();
                            e.preventDefault();
                            openModal(
                                sizeImage(avatar_url, 4096),
                                4096, 4096,
                                avatar_url
                            );
                        }
                    } catch (e) {
                        logError('Error during user avatar patch:', e);
                    }
                }
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
                Patcher.before(ListAvatar.prototype, 'render', (that) => {
                    try { // MUTUAL SERVER/FRIEND ICONS
                        const { props } = that;
                        const icon_url = props.guild?.getIconURL?.(props.size);
                        if (!icon_url) return;
                        
                        const o_onClick = props.onClick?.bind(props) ?? (() => {});
                        props.onClick = (e: React.MouseEvent) => {
                            if (!e.altKey) return o_onClick(e);

                            e.stopPropagation();
                            e.preventDefault();
                            openModal(
                                sizeImage(icon_url, 4096),
                                4096, 4096,
                                icon_url
                            );
                        }
                    } catch (e) {
                        logError('Error during mutual server icon patch:', e);
                    }
                });
            });

        waitForModule(EXPORTS_RichPresenceFilter, { signal, searchExports: true })
            .then(RichPresence => {
                if (!RichPresence) return;
                Patcher.after(RichPresence.prototype, 'render', (that, _, ret) => {
                    try { // RICH PRESENCE IMAGES
                        if (!ret) return;

                        const { props } = ret;
                        
                        props.onClick = (e: React.MouseEvent) => {
                            const img_url = ((el: HTMLElement) => {
                                if (el instanceof HTMLImageElement) return el.currentSrc;
                                if (el.style?.backgroundImage) return el.style.backgroundImage.slice(5, -2);
                            })(e.target as HTMLElement);
                            if (!img_url) return;

                            e.stopPropagation();
                            e.preventDefault();
                            openModal(
                                sizeImage(img_url, 4096),
                                4096, 4096,
                                img_url
                            );
                        }
                    } catch (e) {
                        logError('Error during rich presence patch:', e);
                    }
                });
            });

        waitForModule(VoiceCallAvatarFilter, { signal })
            .then(VoiceCallAvatar => {
                if (!VoiceCallAvatar) return;
                Patcher.after(VoiceCallAvatar.prototype, 'renderVoiceCallAvatar', (that, _, ret) => {
                    try { // VOICE CALL AVATARS
                        const { props } = that;
                        const avatar_url = props.src;
                        if (!avatar_url) return;

                        ret.props.onClick = (e: React.MouseEvent) => {
                            openModal(
                                sizeImage(avatar_url, 4096),
                                4096, 4096,
                                avatar_url
                            );
                        }
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
                    try { // BANNERS
                        if (!props.hasBannerImage) return;
                        const banner_props = props.children.props;
                        const banner_url = banner_props.style.backgroundImage.slice(4, -1);
                        const o_onClick = banner_props.onClick?.bind(banner_props) ?? (() => {});
                        banner_props.onClick = (e: React.MouseEvent) => {
                            if (e.target !== e.currentTarget) return o_onClick(e);
                            e.stopPropagation();
                            e.preventDefault();
                            openModal(
                                sizeImage(banner_url, 4096),
                                4096, 1638,
                                banner_url
                            );
                        }
                    } catch (e) {
                        logError('Error during user banner patch:', e);
                    }
                });
            });
        
        waitForModule(PopoutHandlerFilter, {signal})
            .then(PopoutHandler => {
                if (!PopoutHandler) return;
                Patcher.after(PopoutHandler.prototype, 'render', (that) => {
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

                                    const src = img.currentSrc || avatar_url;
                                    // ^^^ img.currentSrc may sometimes be an empty string when gif avatars are slow to load.
                                    // Fall back to original URL under such circumstances.

                                    e.stopPropagation();
                                    e.preventDefault();
                                    openModal(
                                        sizeImage(src, 4096),
                                        4096, 4096,
                                        avatar_url
                                    );
                                });
                            } catch (e) {
                                logError('Error during chat avatar patch:', e);
                            }

                            try { // ROLE ICONS
                                const img = message_contents_el.querySelector('img[class^="roleIcon"]') as HTMLImageElement;
                                if (!img) return;
                                const icon_url = img.currentSrc;
                                if (!icon_url) return;

                                img.addEventListener('click', (e: MouseEvent) => {
                                    if (!e.altKey) return;

                                    e.stopPropagation();
                                    e.preventDefault();
                                    openModal(
                                        sizeImage(icon_url, 4096),
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

                        const avatar_el = walkTree(that._reactInternals, e => e?.memoizedProps?.className?.includes?.('avatar-'), ['child', 'sibling'])?.stateNode;
                        if (avatar_el) {
                            try {
                                const avatar_url = avatar_el.style.backgroundImage.slice(5, -2);
                                if (!avatar_url) return;

                                avatar_el.addEventListener('click', (e: MouseEvent) => {
                                    if (!e.altKey) return;

                                    e.stopPropagation();
                                    e.preventDefault();
                                    openModal(
                                        sizeImage(avatar_url, 4096),
                                        4096, 4096,
                                        avatar_url
                                    );
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
        
        waitForModule(EmbedFilter, {signal})
            .then(Embed => {
                if (!Embed) return;
                Patcher.after(Embed.prototype, 'renderAuthor', (that, args, ret) => {
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
                                    sizeImage(icon_url, 4096),
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

                Patcher.after(Embed.prototype, 'renderVideo', (that, [render_props], ret) => {
                    if (!that || !ret) return;

                    if (render_props.gifv) return;

                    try { // EMBED VIDEO
                        const { props } = that;
                        
                        const thumbnail = props?.embed?.thumbnail;
                        if (!thumbnail) return;

                        const thumb_url = thumbnail.proxyURL;
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

        waitForModule(EmojiFilter, {signal})
            .then(EmojiWrapper => {
                if (!EmojiWrapper) return;

                const Emoji = getRenderedChildType(EmojiWrapper, t => t.prototype?.render);

                if (!Emoji) {
                    logError(`Can't find Emoji in EmojiWrapper -- structure must have changed, maybe it's a Function component now :(`);
                    return;
                }

                Patcher.before(Emoji.prototype, 'render', (that) => {
                    try { // EMOJIS
                        Patcher.after(that.props, 'onClick', (_, [e]: [React.MouseEvent]) => {
                            try {
                                if (!e.altKey) return;

                                const img = e.target as HTMLImageElement;
                                const emoji_url = img.currentSrc;
                                if (!emoji_url) throw 'Error getting image source';

                                e.stopPropagation();
                                e.preventDefault();
                                openModal(
                                    sizeImage(emoji_url, 4096),
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

        
        waitForModule(FriendsListAvatarFilter, {signal})
            .then(FriendsListAvatar => {
                if (!FriendsListAvatar) return;
                Patcher.after(FriendsListAvatar, 'type', (that, _, ret) => {
                    try { // FRIENDS LIST AVATARS
                        const { props } = ret;
                        const o_onClick = props.onClick?.bind(props) ?? (() => {});
                        props.onClick = (e: React.MouseEvent) => {
                            try {
                                if (!e.altKey) return o_onClick(e);

                                const img = walkTree(e.target, e => e instanceof HTMLImageElement, ['firstElementChild']) as HTMLImageElement;
                                if (!img) return o_onClick(e);

                                const avatar_url = img.currentSrc;
                                if (!avatar_url) throw 'Error getting image source';
                                
                                e.stopPropagation();
                                e.preventDefault();
                                openModal(
                                    sizeImage(avatar_url, 4096),
                                    4096, 4096,
                                    avatar_url
                                );
                                return;
                            } catch (e) {
                                logError('Error during friends list avatar click listener:', e);
                            }
                            return o_onClick(e);
                        }
                    } catch (e) {
                        logError('Error during friends list avatar patch:', e);
                    }
                });
            });

        waitForModule(MediaPlayerFilter, {signal})
            .then((MediaPlayer) => {
                if (!MediaPlayer) return;

                Patcher.after(MediaPlayer.prototype, 'render', (that, _, ret) => {
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
                sizeImage(icon_url, 4096),
                4096, 4096,
                icon_url
            );
        } catch (e) {
            logError('Error during guild click listener', e);
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
}
