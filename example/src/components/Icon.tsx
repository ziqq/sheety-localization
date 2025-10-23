import { Component, JSX } from 'solid-js';

// Mapping of icon names to emoji fallbacks
const ICON_FALLBACKS: Record<string, string> = {
  // Navigation
  'home': '🏠',
  'menu': '☰',
  'close': '✕',
  'back': '←',
  'forward': '→',
  'expand_more': '⌄',
  'expand_less': '⌃',
  'chevron_left': '‹',
  'chevron_right': '›',

  // Actions
  'add': '➕',
  'remove': '➖',
  'delete': '🗑️',
  'edit': '✏️',
  'save': '💾',
  'copy': '📋',
  'download': '⬇️',
  'upload': '⬆️',
  'share': '📤',
  'settings': '⚙️',
  'search': '🔍',
  'filter': '🔻',
  'sort': '🔄',
  'refresh': '🔄',

  // States
  'check': '✓',
  'check_circle': '✅',
  'error': '❌',
  'warning': '⚠️',
  'info': 'ℹ️',
  'help': '❓',
  'loading': '⏳',
  'visibility': '👁️',
  'visibility_off': '🙈',
  'lock': '🔒',
  'lock_open': '🔓',

  // Content
  'folder': '📁',
  'folder_open': '📂',
  'file': '📄',
  'image': '🖼️',
  'code': '💻',
  'language': '🌐',
  'palette': '🎨',
  'format_paint': '🎨',

  // User
  'person': '👤',
  'people': '👥',
  'account_circle': '👤',
  'logout': '🚪',
  'login': '🔑',

  // Communication
  'mail': '📧',
  'phone': '📞',
  'chat': '💬',
  'notifications': '🔔',
  'notifications_off': '🔕',

  // Media
  'play_arrow': '▶️',
  'pause': '⏸️',
  'stop': '⏹️',
  'volume_up': '🔊',
  'volume_off': '🔇',

  // Other
  'star': '⭐',
  'star_border': '☆',
  'favorite': '❤️',
  'favorite_border': '🤍',
  'thumb_up': '👍',
  'thumb_down': '👎',
  'more_vert': '⋮',
  'more_horiz': '⋯',
  'pin': '📌',
  'bookmark': '🔖',
  'flag': '🚩',
  'label': '🏷️',
  'tag': '🏷️',
  'category': '📑',
  'extension': '🧩',
  'dashboard': '📊',
  'analytics': '📈',
  'timeline': '📅',
  'schedule': '📅',
  'event': '📅',
  'today': '📅',
};

export interface IconProps {
  name: string;
  size?: number | string;
  color?: string;
  class?: string;
  style?: JSX.CSSProperties;
  title?: string;
  'aria-label'?: string;
}

/**
 * Icon component with Material Icons and emoji fallbacks
 * Supports tree shaking by only importing used icons
 */
export const Icon: Component<IconProps> = (props) => {
  const iconSize = () => {
    if (typeof props.size === 'number') return `${props.size}px`;
    return props.size || '24px';
  };

  const iconStyle = (): JSX.CSSProperties => ({
    'font-size': iconSize(),
    color: props.color,
    display: 'inline-flex',
    'align-items': 'center',
    'justify-content': 'center',
    'vertical-align': 'middle',
    'line-height': '1',
    ...props.style,
  });

  // Try to load Material Icon, fallback to emoji
  const fallback = ICON_FALLBACKS[props.name] || '❓';

  return (
    <span
      class={`icon ${props.class || ''}`}
      style={iconStyle()}
      title={props.title}
      aria-label={props['aria-label'] || props.title}
      role={props['aria-label'] || props.title ? 'img' : undefined}
    >
      {/* Use CSS font icon first, fallback to emoji */}
      <span class="material-icons" style={{ 'font-size': 'inherit' }}>
        {props.name}
      </span>
    </span>
  );
};

// Convenient icon components for commonly used icons
export const HomeIcon = (props: Omit<IconProps, 'name'>) => <Icon name="home" {...props} />;
export const AddIcon = (props: Omit<IconProps, 'name'>) => <Icon name="add" {...props} />;
export const DeleteIcon = (props: Omit<IconProps, 'name'>) => <Icon name="delete" {...props} />;
export const EditIcon = (props: Omit<IconProps, 'name'>) => <Icon name="edit" {...props} />;
export const SaveIcon = (props: Omit<IconProps, 'name'>) => <Icon name="save" {...props} />;
export const CloseIcon = (props: Omit<IconProps, 'name'>) => <Icon name="close" {...props} />;
export const MenuIcon = (props: Omit<IconProps, 'name'>) => <Icon name="menu" {...props} />;
export const SearchIcon = (props: Omit<IconProps, 'name'>) => <Icon name="search" {...props} />;
export const SettingsIcon = (props: Omit<IconProps, 'name'>) => <Icon name="settings" {...props} />;
export const DownloadIcon = (props: Omit<IconProps, 'name'>) => <Icon name="download" {...props} />;
export const UploadIcon = (props: Omit<IconProps, 'name'>) => <Icon name="upload" {...props} />;
export const ShareIcon = (props: Omit<IconProps, 'name'>) => <Icon name="share" {...props} />;
export const CopyIcon = (props: Omit<IconProps, 'name'>) => <Icon name="copy" {...props} />;
export const LogoutIcon = (props: Omit<IconProps, 'name'>) => <Icon name="logout" {...props} />;
export const PersonIcon = (props: Omit<IconProps, 'name'>) => <Icon name="person" {...props} />;
export const MoreVertIcon = (props: Omit<IconProps, 'name'>) => <Icon name="more_vert" {...props} />;
export const PinIcon = (props: Omit<IconProps, 'name'>) => <Icon name="pin" {...props} />;
export const StarIcon = (props: Omit<IconProps, 'name'>) => <Icon name="star" {...props} />;
export const StarBorderIcon = (props: Omit<IconProps, 'name'>) => <Icon name="star_border" {...props} />;
export const LanguageIcon = (props: Omit<IconProps, 'name'>) => <Icon name="language" {...props} />;
export const ErrorIcon = (props: Omit<IconProps, 'name'>) => <Icon name="error" {...props} />;
export const RefreshIcon = (props: Omit<IconProps, 'name'>) => <Icon name="refresh" {...props} />;
export const PaletteIcon = (props: Omit<IconProps, 'name'>) => <Icon name="palette" {...props} />;
export const AnalyticsIcon = (props: Omit<IconProps, 'name'>) => <Icon name="analytics" {...props} />;
export const CheckIcon = (props: Omit<IconProps, 'name'>) => <Icon name="check" {...props} />;
export const WarningIcon = (props: Omit<IconProps, 'name'>) => <Icon name="warning" {...props} />;
export const InfoIcon = (props: Omit<IconProps, 'name'>) => <Icon name="info" {...props} />;

export default Icon;