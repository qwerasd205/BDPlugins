
import { byProps } from "utils/BdApi";

const hasSubstrings = (str: any, ...subs: string[]) => typeof str === 'string' && subs.every(sub => str.includes(sub));

export const PopoutHandlerFilter: FilterFn     = m => m?.Align && m.Positions && m.contextType && m.defaultProps?.autoInvert != null;
export const ListAvatarFilter: FilterFn        = m => m.Sizes?.MINI && m.defaultProps?.size && m.defaultProps.tooltipPosition;
export const EmbedFilter: FilterFn             = m => m?.prototype?.renderAuthor && m.prototype.renderMedia;
export const VoiceCallAvatarFilter: FilterFn   = m => m?.prototype?.renderVoiceCallAvatar;
export const MediaPlayerFilter: FilterFn       = m => hasSubstrings(m.prototype?.render?.toString?.(), '"mediaPlayerClassName","poster"');
export const ChannelListHeaderFilter: FilterFn = m => hasSubstrings(m.type?.toString?.(), 'hasCommunityInfoSubheader');
export const FriendsListAvatarFilter: FilterFn = m => hasSubstrings(m.type?.toString?.(), '"user","size","animate","aria-hidden"');
export const EmojiFilter: FilterFn             = m => hasSubstrings(m.toString?.(), 'autoplay,reduceMotion:');
export const BannerFilter: FilterFn            = m => hasSubstrings(m.toString?.(), 'overrideAvatarDecorationURL');
export const AvatarFilter: FilterFn            = m => hasSubstrings(m.toString?.(), 'typingIndicatorRef', 'statusBackdropColor');
export const MessageFilter: FilterFn           = m => hasSubstrings(m.toString?.(), '"childrenSystemMessage"');
export const GameIconFilter: FilterFn          = m => m.Sizes?.XSMALL && hasSubstrings(m.toString?.(), '"skuId","pid"');

export const EXPORTS_RichPresenceFilter: FilterFn         = m => m.prototype?.renderImage && m.prototype.renderGameImage;
export const EXPORTS_PrivateChannelRouterFilter: FilterFn = m => hasSubstrings(m.render?.toString?.(), '"replace","to","innerRef"');

export const SectionTitleFilter: FilterFn      = m => m.Tags && hasSubstrings(m.toString?.(), '"faded","disabled","required"');
export const FormTextFilter: FilterFn          = m => m?.Sizes?.SIZE_32 && m.Colors;
export const SliderFilter: FilterFn            = m => m?.prototype?.renderMark;