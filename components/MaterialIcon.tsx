import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

export type MaterialIconName =
  | 'dashboard'
  | 'forum'
  | 'graphic_eq'
  | 'grid_view'
  | 'memory'
  | 'calendar_today'
  | 'magic_button'
  | 'keyboard'
  | 'event_note'
  | 'summarize'
  | 'pie_chart'
  | 'local_grocery_store'
  | 'check_circle'
  | 'timelapse'
  | 'arrow_upward'
  | 'developer_board'
  | 'chevron_right'
  | 'sticky_note_2'
  | 'bolt'
  | 'flag'
  | 'schedule'
  | 'done'
  | 'account_balance_wallet'
  | 'receipt_long'
  | 'shopping_cart'
  | 'skillet'
  | 'insights'
  | 'tune'
  | 'expand_more'
  | 'verified_user'
  | 'done_all'
  | 'terminal'
  | 'close'
  | 'add_shopping_cart'
  | 'checklist'
  | 'ios_share'
  | 'content_copy'
  | 'volume_up'
  | 'refresh'
  | 'thumb_up'
  | 'thumb_down'
  | 'swap_horiz'
  | 'timer'
  | 'calculate'
  | 'add'
  | 'photo_camera'
  | 'mic'
  | 'mic_off'
  | 'person'
  | 'auto_awesome'
  | 'format_list_bulleted'
  | 'call_end'
  | 'lock'
  | 'waving_hand'
  | 'unfold_less'
  | 'unfold_more'
  | 'neurology'
  | 'play_arrow'
  | 'pause'
  | 'replay_10'
  | 'add_circle'
  | 'table_restaurant'
  | 'document_scanner'
  | 'apps'
  | 'edit_note'
  | 'shopping_bag'
  | 'task_alt'
  | 'check'
  | 'arrow_forward_ios'
  | 'description'
  | 'push_pin'
  | 'link'
  | 'auto_mode'
  | 'check_box'
  | 'check_box_outline_blank'
  | 'enhanced_encryption'
  | 'attach_money'
  | 'note_add'
  | 'hard_drive'
  | 'search'
  | 'chat_bubble'
  | 'visibility'
  | 'hub'
  | 'more_vert'
  | 'delete'
  | 'arrow_downward'
  | 'file_upload'
  | 'arrow_forward'
  | 'shield_locked'
  | 'dataset'
  | 'encrypted'
  | 'arrow_back_ios_new'
  | 'arrow_back'
  | 'badge'
  | 'face'
  | 'verified'
  | 'notifications_active'
  | 'mic_double'
  | 'record_voice_over'
  | 'usb'
  | 'battery_saver'
  | 'menu';

interface MaterialIconProps {
  name: MaterialIconName;
  size?: number;
  color?: string;
  filled?: boolean;
  strokeWidth?: number;
}

export const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  size = 20,
  color = '#e4e1ee',
  filled = false,
  strokeWidth = 1.85,
}) => {
  const strokeProps = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  switch (name) {
    case 'dashboard':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3" y="3" width="7.5" height="9.5" rx="1.6" {...strokeProps} />
          <Rect x="13.5" y="3" width="7.5" height="5.5" rx="1.6" {...strokeProps} />
          <Rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.6" {...strokeProps} />
          <Rect x="3" y="15.5" width="7.5" height="5.5" rx="1.6" {...strokeProps} />
        </Svg>
      );

    case 'forum':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M4 5.5A1.5 1.5 0 0 1 5.5 4h11A1.5 1.5 0 0 1 18 5.5v7a1.5 1.5 0 0 1-1.5 1.5H8.5L5 17.5V14H5.5A1.5 1.5 0 0 1 4 12.5v-7Z"
            {...strokeProps}
          />
          <Path d="M18 8h1.5A1.5 1.5 0 0 1 21 9.5v8.5l-3-2.5h-6.5" {...strokeProps} />
        </Svg>
      );

    case 'graphic_eq':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="4" y1="10" x2="4" y2="14" {...strokeProps} strokeWidth={2.2} />
          <Line x1="8" y1="6.5" x2="8" y2="17.5" {...strokeProps} strokeWidth={2.2} />
          <Line x1="12" y1="3.5" x2="12" y2="20.5" {...strokeProps} strokeWidth={2.2} />
          <Line x1="16" y1="6.5" x2="16" y2="17.5" {...strokeProps} strokeWidth={2.2} />
          <Line x1="20" y1="10" x2="20" y2="14" {...strokeProps} strokeWidth={2.2} />
        </Svg>
      );

    case 'grid_view':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3.5" y="3.5" width="7" height="7" rx="1.5" {...strokeProps} />
          <Rect x="13.5" y="3.5" width="7" height="7" rx="1.5" {...strokeProps} />
          <Rect x="3.5" y="13.5" width="7" height="7" rx="1.5" {...strokeProps} />
          <Rect x="13.5" y="13.5" width="7" height="7" rx="1.5" {...strokeProps} />
        </Svg>
      );

    case 'memory':
    case 'developer_board':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="6" y="6" width="12" height="12" rx="2" {...strokeProps} />
          <Rect x="9.5" y="9.5" width="5" height="5" rx="0.8" {...strokeProps} />
          <Line x1="9" y1="3" x2="9" y2="6" {...strokeProps} />
          <Line x1="15" y1="3" x2="15" y2="6" {...strokeProps} />
          <Line x1="9" y1="18" x2="9" y2="21" {...strokeProps} />
          <Line x1="15" y1="18" x2="15" y2="21" {...strokeProps} />
          <Line x1="3" y1="9" x2="6" y2="9" {...strokeProps} />
          <Line x1="3" y1="15" x2="6" y2="15" {...strokeProps} />
          <Line x1="18" y1="9" x2="21" y2="9" {...strokeProps} />
          <Line x1="18" y1="15" x2="21" y2="15" {...strokeProps} />
        </Svg>
      );

    case 'calendar_today':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3.5" y="5" width="17" height="15.5" rx="2.2" {...strokeProps} />
          <Line x1="3.5" y1="10" x2="20.5" y2="10" {...strokeProps} />
          <Line x1="8" y1="3" x2="8" y2="6.5" {...strokeProps} />
          <Line x1="16" y1="3" x2="16" y2="6.5" {...strokeProps} />
        </Svg>
      );

    case 'magic_button':
    case 'auto_awesome':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M11 3.5L13 9l5.5 2L13 13l-2 5.5L9 13 3.5 11 9 9l2-5.5Z"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
          <Path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" fill={color} />
        </Svg>
      );

    case 'keyboard':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="2.5" y="5.5" width="19" height="13" rx="2.2" {...strokeProps} />
          <Line x1="6.5" y1="9.5" x2="7.5" y2="9.5" {...strokeProps} />
          <Line x1="10.5" y1="9.5" x2="11.5" y2="9.5" {...strokeProps} />
          <Line x1="14.5" y1="9.5" x2="15.5" y2="9.5" {...strokeProps} />
          <Line x1="17.5" y1="9.5" x2="17.5" y2="9.5" {...strokeProps} />
          <Line x1="6.5" y1="12.5" x2="7.5" y2="12.5" {...strokeProps} />
          <Line x1="10.5" y1="12.5" x2="11.5" y2="12.5" {...strokeProps} />
          <Line x1="14.5" y1="12.5" x2="15.5" y2="12.5" {...strokeProps} />
          <Line x1="8" y1="15.5" x2="16" y2="15.5" {...strokeProps} />
        </Svg>
      );

    case 'event_note':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3.5" y="4.5" width="17" height="16" rx="2" {...strokeProps} />
          <Line x1="3.5" y1="9" x2="20.5" y2="9" {...strokeProps} />
          <Line x1="8" y1="2.5" x2="8" y2="6" {...strokeProps} />
          <Line x1="16" y1="2.5" x2="16" y2="6" {...strokeProps} />
          <Line x1="7.5" y1="13" x2="16.5" y2="13" {...strokeProps} />
          <Line x1="7.5" y1="16.5" x2="13.5" y2="16.5" {...strokeProps} />
        </Svg>
      );

    case 'summarize':
    case 'description':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M6 3.5h8.5L19 8v12.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20.5V5A1.5 1.5 0 0 1 6.5 3.5Z"
            {...strokeProps}
          />
          <Polyline points="14,3.5 14,8.5 19,8.5" {...strokeProps} />
          <Line x1="8.5" y1="12.5" x2="15.5" y2="12.5" {...strokeProps} />
          <Line x1="8.5" y1="16" x2="13.5" y2="16" {...strokeProps} />
        </Svg>
      );

    case 'pie_chart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M21 12A9 9 0 1 1 12 3v9h9Z" {...strokeProps} />
          <Path d="M14.5 3.4A9 9 0 0 1 20.6 9.5H14.5V3.4Z" {...strokeProps} />
        </Svg>
      );

    case 'local_grocery_store':
    case 'shopping_cart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 4.5h2.5l2 10.5h10.5l2-7.5H6.2" {...strokeProps} />
          <Circle cx="9" cy="19" r="1.4" fill={color} />
          <Circle cx="17" cy="19" r="1.4" fill={color} />
        </Svg>
      );

    case 'add_shopping_cart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 5h2.4l2 10h10.2l1.8-6.5H15.5" {...strokeProps} />
          <Line x1="12" y1="4.5" x2="12" y2="10.5" {...strokeProps} />
          <Line x1="9" y1="7.5" x2="15" y2="7.5" {...strokeProps} />
          <Circle cx="9" cy="19" r="1.4" fill={color} />
          <Circle cx="17" cy="19" r="1.4" fill={color} />
        </Svg>
      );

    case 'check_circle':
    case 'task_alt':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" {...strokeProps} />
          <Polyline points="8.5,12.2 11,14.7 15.8,9.5" {...strokeProps} />
        </Svg>
      );

    case 'timelapse':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" {...strokeProps} />
          <Path d="M12 7v5l3.5 3.5A5 5 0 0 0 12 7Z" fill={color} opacity={0.85} />
        </Svg>
      );

    case 'arrow_upward':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="12" y1="19" x2="12" y2="5" {...strokeProps} strokeWidth={2.2} />
          <Polyline points="6.5,10.5 12,5 17.5,10.5" {...strokeProps} strokeWidth={2.2} />
        </Svg>
      );

    case 'arrow_downward':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="12" y1="5" x2="12" y2="19" {...strokeProps} strokeWidth={2.2} />
          <Polyline points="6.5,13.5 12,19 17.5,13.5" {...strokeProps} strokeWidth={2.2} />
        </Svg>
      );

    case 'arrow_forward':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="5" y1="12" x2="19" y2="12" {...strokeProps} />
          <Polyline points="13,6 19,12 13,18" {...strokeProps} />
        </Svg>
      );

    case 'chevron_right':
    case 'arrow_forward_ios':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="9.5,6 15.5,12 9.5,18" {...strokeProps} />
        </Svg>
      );

    case 'expand_more':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="6,9.5 12,15.5 18,9.5" {...strokeProps} />
        </Svg>
      );

    case 'sticky_note_2':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4.5 4.5h15v10.5l-4.5 4.5H4.5v-15Z" {...strokeProps} />
          <Polyline points="15,19.5 15,15 19.5,15" {...strokeProps} />
          <Line x1="8" y1="9" x2="16" y2="9" {...strokeProps} />
          <Line x1="8" y1="12.5" x2="13" y2="12.5" {...strokeProps} />
        </Svg>
      );

    case 'bolt':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M13 2.5L5.5 13h5.5l-1 8.5L18.5 11H13l0-8.5Z"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'flag':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="5.5" y1="4" x2="5.5" y2="20.5" {...strokeProps} />
          <Path d="M5.5 5h10l-1.5 4 1.5 4h-10" {...strokeProps} />
        </Svg>
      );

    case 'schedule':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" {...strokeProps} />
          <Polyline points="12,7 12,12 15.5,14" {...strokeProps} />
        </Svg>
      );

    case 'done':
    case 'check':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="5,12.5 10,17.5 19.5,7" {...strokeProps} strokeWidth={2.2} />
        </Svg>
      );

    case 'done_all':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="2.5,13 7,17.5 15.5,8" {...strokeProps} />
          <Polyline points="10.5,17.5 12.5,17.5 21.5,8" {...strokeProps} />
        </Svg>
      );

    case 'account_balance_wallet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3" y="5.5" width="18" height="13.5" rx="2.2" {...strokeProps} />
          <Path d="M15 10h6v4.5h-6a2.25 2.25 0 0 1 0-4.5Z" {...strokeProps} />
          <Circle cx="16.5" cy="12.25" r="0.9" fill={color} />
        </Svg>
      );

    case 'receipt_long':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M6.5 3.5h11a1.5 1.5 0 0 1 1.5 1.5v15.5l-2.5-1.7-2.5 1.7-2.5-1.7-2.5 1.7-2.5-1.7V5A1.5 1.5 0 0 1 6.5 3.5Z"
            {...strokeProps}
          />
          <Line x1="9.5" y1="8.5" x2="15.5" y2="8.5" {...strokeProps} />
          <Line x1="9.5" y1="12" x2="15.5" y2="12" {...strokeProps} />
          <Line x1="9.5" y1="15.5" x2="13" y2="15.5" {...strokeProps} />
        </Svg>
      );

    case 'skillet':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M3.5 12.5h13.5v2a4.5 4.5 0 0 1-4.5 4.5H8a4.5 4.5 0 0 1-4.5-4.5v-2Z"
            {...strokeProps}
          />
          <Line x1="17" y1="12.5" x2="21.5" y2="10.5" {...strokeProps} />
          <Line x1="7.5" y1="6.5" x2="7.5" y2="9" {...strokeProps} />
          <Line x1="10.5" y1="5" x2="10.5" y2="9" {...strokeProps} />
          <Line x1="13.5" y1="6.5" x2="13.5" y2="9" {...strokeProps} />
        </Svg>
      );

    case 'insights':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="3.5,17 9,11.5 13,15 20,7.5" {...strokeProps} />
          <Circle cx="20" cy="7.5" r="1.5" fill={color} />
          <Circle cx="13" cy="15" r="1.3" fill={color} />
          <Circle cx="9" cy="11.5" r="1.3" fill={color} />
          <Path d="M6 5l.8 1.8L8.5 7.5 6.8 8.2 6 10l-.8-1.8-1.7-.7 1.7-.7L6 5Z" fill={color} />
        </Svg>
      );

    case 'tune':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="3.5" y1="7" x2="20.5" y2="7" {...strokeProps} />
          <Circle cx="9" cy="7" r="2.2" fill="#13121c" stroke={color} strokeWidth={strokeWidth} />
          <Line x1="3.5" y1="12" x2="20.5" y2="12" {...strokeProps} />
          <Circle
            cx="15.5"
            cy="12"
            r="2.2"
            fill="#13121c"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Line x1="3.5" y1="17" x2="20.5" y2="17" {...strokeProps} />
          <Circle
            cx="10.5"
            cy="17"
            r="2.2"
            fill="#13121c"
            stroke={color}
            strokeWidth={strokeWidth}
          />
        </Svg>
      );

    case 'verified_user':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 3l7.5 3.2v5.3c0 4.8-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.7-7.5-9.5V6.2L12 3Z"
            {...strokeProps}
          />
          <Polyline points="9,12 11.2,14.2 15.5,9.8" {...strokeProps} />
        </Svg>
      );

    case 'terminal':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3" y="4.5" width="18" height="15" rx="2.2" {...strokeProps} />
          <Polyline points="7,10 10.5,12.5 7,15" {...strokeProps} />
          <Line x1="12.5" y1="15" x2="17" y2="15" {...strokeProps} />
        </Svg>
      );

    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="6" y1="6" x2="18" y2="18" {...strokeProps} strokeWidth={2.1} />
          <Line x1="18" y1="6" x2="6" y2="18" {...strokeProps} strokeWidth={2.1} />
        </Svg>
      );

    case 'checklist':
    case 'format_list_bulleted':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="9" y1="7" x2="20" y2="7" {...strokeProps} />
          <Line x1="9" y1="12" x2="20" y2="12" {...strokeProps} />
          <Line x1="9" y1="17" x2="20" y2="17" {...strokeProps} />
          <Circle cx="5" cy="7" r="1.2" fill={color} />
          <Circle cx="5" cy="12" r="1.2" fill={color} />
          <Circle cx="5" cy="17" r="1.2" fill={color} />
        </Svg>
      );

    case 'ios_share':
    case 'file_upload':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="12" y1="14.5" x2="12" y2="4" {...strokeProps} />
          <Polyline points="8,8 12,4 16,8" {...strokeProps} />
          <Path d="M5 13.5v5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-5" {...strokeProps} />
        </Svg>
      );

    case 'content_copy':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="8.5" y="7.5" width="11" height="13" rx="1.8" {...strokeProps} />
          <Path
            d="M15.5 7.5V5.3A1.8 1.8 0 0 0 13.7 3.5H6.3A1.8 1.8 0 0 0 4.5 5.3v10.4a1.8 1.8 0 0 0 1.8 1.8h2.2"
            {...strokeProps}
          />
        </Svg>
      );

    case 'volume_up':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5Z" {...strokeProps} />
          <Path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4" {...strokeProps} />
          <Path d="M18.2 6.2a8 8 0 0 1 0 11.6" {...strokeProps} />
        </Svg>
      );

    case 'refresh':
    case 'auto_mode':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9" {...strokeProps} />
          <Polyline points="19.5,4.5 19.5,9 15,9" {...strokeProps} />
        </Svg>
      );

    case 'thumb_up':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M7 10.5V20H4.5A1.5 1.5 0 0 1 3 18.5v-6.5A1.5 1.5 0 0 1 4.5 10.5H7Zm0 0l3.5-6.5a1.8 1.8 0 0 1 2.5 1.6v4.4h5.2a2 2 0 0 1 1.9 2.5l-1.3 5.5a2 2 0 0 1-1.9 1.5H7"
            {...strokeProps}
          />
        </Svg>
      );

    case 'thumb_down':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M17 13.5V4h2.5A1.5 1.5 0 0 1 21 5.5V12a1.5 1.5 0 0 1-1.5 1.5H17Zm0 0L13.5 20a1.8 1.8 0 0 1-2.5-1.6V14H5.8a2 2 0 0 1-1.9-2.5l1.3-5.5a2 2 0 0 1 1.9-1.5H17"
            {...strokeProps}
          />
        </Svg>
      );

    case 'swap_horiz':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="4.5" y1="8.5" x2="19.5" y2="8.5" {...strokeProps} />
          <Polyline points="15.5,5 19.5,8.5 15.5,12" {...strokeProps} />
          <Line x1="19.5" y1="15.5" x2="4.5" y2="15.5" {...strokeProps} />
          <Polyline points="8.5,12 4.5,15.5 8.5,19" {...strokeProps} />
        </Svg>
      );

    case 'timer':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="9.5" y1="3" x2="14.5" y2="3" {...strokeProps} />
          <Circle cx="12" cy="13.5" r="7.5" {...strokeProps} />
          <Line x1="12" y1="13.5" x2="15.5" y2="10" {...strokeProps} />
        </Svg>
      );

    case 'calculate':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="4" y="3.5" width="16" height="17" rx="2.2" {...strokeProps} />
          <Line x1="7.5" y1="8.5" x2="11" y2="8.5" {...strokeProps} />
          <Line x1="9.25" y1="6.75" x2="9.25" y2="10.25" {...strokeProps} />
          <Line x1="13.5" y1="8.5" x2="16.5" y2="8.5" {...strokeProps} />
          <Line x1="7.5" y1="15" x2="11" y2="15" {...strokeProps} />
          <Line x1="13.5" y1="14" x2="16.5" y2="14" {...strokeProps} />
          <Line x1="13.5" y1="16.5" x2="16.5" y2="16.5" {...strokeProps} />
        </Svg>
      );

    case 'add':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="12" y1="5" x2="12" y2="19" {...strokeProps} strokeWidth={2.2} />
          <Line x1="5" y1="12" x2="19" y2="12" {...strokeProps} strokeWidth={2.2} />
        </Svg>
      );

    case 'add_circle':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" {...strokeProps} />
          <Line x1="12" y1="8" x2="12" y2="16" {...strokeProps} />
          <Line x1="8" y1="12" x2="16" y2="12" {...strokeProps} />
        </Svg>
      );

    case 'photo_camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M4 7.5h3l1.5-2h7l1.5 2h3a1.5 1.5 0 0 1 1.5 1.5v9.5A1.5 1.5 0 0 1 20 20H4a1.5 1.5 0 0 1-1.5-1.5V9A1.5 1.5 0 0 1 4 7.5Z"
            {...strokeProps}
          />
          <Circle cx="12" cy="13.5" r="3.2" {...strokeProps} />
        </Svg>
      );

    case 'mic':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect
            x="9"
            y="3.5"
            width="6"
            height="10.5"
            rx="3"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" {...strokeProps} />
          <Line x1="12" y1="18" x2="12" y2="21" {...strokeProps} />
          <Line x1="9" y1="21" x2="15" y2="21" {...strokeProps} />
        </Svg>
      );

    case 'mic_off':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M9 6.5a3 3 0 0 1 6 0v5" {...strokeProps} />
          <Path d="M6 11.5a6 6 0 0 0 9.6 4.8" {...strokeProps} />
          <Line x1="12" y1="18" x2="12" y2="21" {...strokeProps} />
          <Line x1="3.5" y1="3.5" x2="20.5" y2="20.5" {...strokeProps} />
        </Svg>
      );

    case 'person':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="8" r="3.5" {...strokeProps} />
          <Path d="M5 19.5c0-3.5 3.1-5.5 7-5.5s7 2 7 5.5" {...strokeProps} />
        </Svg>
      );

    case 'call_end':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M3.5 14.2c4.5-4.3 12.5-4.3 17 0l-2.2 2.4a1.2 1.2 0 0 1-1.6.1l-2.2-1.6a1.2 1.2 0 0 1-.5-1V13a10 10 0 0 0-4 0v1.1a1.2 1.2 0 0 1-.5 1l-2.2 1.6a1.2 1.2 0 0 1-1.6-.1l-2.2-2.4Z"
            fill={color}
          />
        </Svg>
      );

    case 'lock':
    case 'enhanced_encryption':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="5" y="10.5" width="14" height="10" rx="2" {...strokeProps} />
          <Path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" {...strokeProps} />
          <Circle cx="12" cy="15.5" r="1.2" fill={color} />
        </Svg>
      );

    case 'waving_hand':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11m0-2V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5V7a1.5 1.5 0 0 1 3 0v5.5c0 4-2.5 7.5-6.5 7.5S4 17 4 13v-2a1.5 1.5 0 0 1 3 0Z"
            {...strokeProps}
          />
        </Svg>
      );

    case 'unfold_less':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="7.5,6.5 12,11 16.5,6.5" {...strokeProps} />
          <Polyline points="7.5,17.5 12,13 16.5,17.5" {...strokeProps} />
        </Svg>
      );

    case 'unfold_more':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="7.5,9.5 12,5 16.5,9.5" {...strokeProps} />
          <Polyline points="7.5,14.5 12,19 16.5,14.5" {...strokeProps} />
        </Svg>
      );

    case 'neurology':
    case 'hub':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="2.6" {...strokeProps} />
          <Circle cx="5.5" cy="7.5" r="1.8" {...strokeProps} />
          <Circle cx="18.5" cy="7.5" r="1.8" {...strokeProps} />
          <Circle cx="12" cy="19.5" r="1.8" {...strokeProps} />
          <Line x1="7.2" y1="8.5" x2="9.8" y2="10.4" {...strokeProps} />
          <Line x1="16.8" y1="8.5" x2="14.2" y2="10.4" {...strokeProps} />
          <Line x1="12" y1="14.6" x2="12" y2="17.7" {...strokeProps} />
        </Svg>
      );

    case 'play_arrow':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M7.5 5.5v13l11-6.5-11-6.5Z" fill={color} />
        </Svg>
      );

    case 'pause':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="6.5" y="5" width="3.8" height="14" rx="1" fill={color} />
          <Rect x="13.7" y="5" width="3.8" height="14" rx="1" fill={color} />
        </Svg>
      );

    case 'replay_10':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M12 5a7 7 0 1 1-6.7 9" {...strokeProps} />
          <Polyline points="8,5 12,5 10.5,8.5" {...strokeProps} />
          <Circle cx="12" cy="12.5" r="1.2" fill={color} />
        </Svg>
      );

    case 'table_restaurant':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 10l2-4h14l2 4H3Z" {...strokeProps} />
          <Line x1="6.5" y1="10" x2="5.5" y2="19" {...strokeProps} />
          <Line x1="17.5" y1="10" x2="18.5" y2="19" {...strokeProps} />
          <Line x1="6.2" y1="14" x2="17.8" y2="14" {...strokeProps} />
        </Svg>
      );

    case 'document_scanner':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M4 7V4.5A1.5 1.5 0 0 1 5.5 3H8M16 3h2.5A1.5 1.5 0 0 1 20 4.5V7M20 17v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 21H5.5A1.5 1.5 0 0 1 4 19.5V17"
            {...strokeProps}
          />
          <Line x1="8" y1="9.5" x2="16" y2="9.5" {...strokeProps} />
          <Line x1="8" y1="12.5" x2="16" y2="12.5" {...strokeProps} />
          <Line x1="8" y1="15.5" x2="13" y2="15.5" {...strokeProps} />
        </Svg>
      );

    case 'apps':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="6" cy="6" r="1.8" fill={color} />
          <Circle cx="12" cy="6" r="1.8" fill={color} />
          <Circle cx="18" cy="6" r="1.8" fill={color} />
          <Circle cx="6" cy="12" r="1.8" fill={color} />
          <Circle cx="12" cy="12" r="1.8" fill={color} />
          <Circle cx="18" cy="12" r="1.8" fill={color} />
          <Circle cx="6" cy="18" r="1.8" fill={color} />
          <Circle cx="12" cy="18" r="1.8" fill={color} />
          <Circle cx="18" cy="18" r="1.8" fill={color} />
        </Svg>
      );

    case 'edit_note':
    case 'note_add':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="4" y1="7" x2="14" y2="7" {...strokeProps} />
          <Line x1="4" y1="11.5" x2="14" y2="11.5" {...strokeProps} />
          <Line x1="4" y1="16" x2="10" y2="16" {...strokeProps} />
          <Path d="M14.5 18.5l4.8-4.8a1.4 1.4 0 0 1 2 2l-4.8 4.8-2.5.5.5-2.5Z" {...strokeProps} />
        </Svg>
      );

    case 'shopping_bag':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5.5 8h13l-1 12.5H6.5L5.5 8Z" {...strokeProps} />
          <Path d="M9 8V6.5a3 3 0 0 1 6 0V8" {...strokeProps} />
        </Svg>
      );

    case 'push_pin':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M14.5 4.5l5 5-3.5 3.5-1.5 4-4-4-5 5 5-5-4-4 4-1.5 3.5-3.5Z"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        </Svg>
      );

    case 'link':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M10 13.5a3.5 3.5 0 0 1 0-5l2-2a3.5 3.5 0 1 1 5 5l-1 1" {...strokeProps} />
          <Path d="M14 10.5a3.5 3.5 0 0 1 0 5l-2 2a3.5 3.5 0 1 1-5-5l1-1" {...strokeProps} />
        </Svg>
      );

    case 'check_box':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="4" y="4" width="16" height="16" rx="3" fill={color} />
          <Polyline
            points="8,12.2 10.8,15 16.2,9.2"
            stroke="#0d0d16"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      );

    case 'check_box_outline_blank':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="4" y="4" width="16" height="16" rx="3" {...strokeProps} />
        </Svg>
      );

    case 'attach_money':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="12" y1="3" x2="12" y2="21" {...strokeProps} />
          <Path
            d="M16 7.5c0-1.7-1.8-2.8-4-2.8s-4 1-4 2.7 1.3 2.5 4 3 4 1.3 4 3.2-1.8 3-4 3-4-1.2-4-2.8"
            {...strokeProps}
          />
        </Svg>
      );

    case 'hard_drive':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3.5" y="5" width="17" height="14" rx="2.2" {...strokeProps} />
          <Line x1="3.5" y1="14" x2="20.5" y2="14" {...strokeProps} />
          <Circle cx="16.5" cy="16.5" r="1" fill={color} />
        </Svg>
      );

    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="11" cy="11" r="6.8" {...strokeProps} />
          <Line x1="16.2" y1="16.2" x2="20.5" y2="20.5" {...strokeProps} strokeWidth={2.1} />
        </Svg>
      );

    case 'chat_bubble':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M4.5 6.5A2 2 0 0 1 6.5 4.5h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4.5 3.5V6.5Z"
            {...strokeProps}
          />
        </Svg>
      );

    case 'visibility':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" {...strokeProps} />
          <Circle cx="12" cy="12" r="2.7" {...strokeProps} />
        </Svg>
      );

    case 'more_vert':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="6" r="1.5" fill={color} />
          <Circle cx="12" cy="12" r="1.5" fill={color} />
          <Circle cx="12" cy="18" r="1.5" fill={color} />
        </Svg>
      );

    case 'delete':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="4.5" y1="6.5" x2="19.5" y2="6.5" {...strokeProps} />
          <Path d="M9.5 6.5V4.5h5v2" {...strokeProps} />
          <Path
            d="M6.5 6.5l1 13a1.5 1.5 0 0 0 1.5 1.5h6a1.5 1.5 0 0 0 1.5-1.5l1-13"
            {...strokeProps}
          />
          <Line x1="10" y1="10.5" x2="10" y2="16.5" {...strokeProps} />
          <Line x1="14" y1="10.5" x2="14" y2="16.5" {...strokeProps} />
        </Svg>
      );

    case 'shield_locked':
    case 'encrypted':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 3l7.5 3.2v5.3c0 4.8-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.7-7.5-9.5V6.2L12 3Z"
            {...strokeProps}
          />
          <Rect x="9" y="11" width="6" height="4.5" rx="1" {...strokeProps} />
          <Path d="M10.2 11V9.5a1.8 1.8 0 0 1 3.6 0V11" {...strokeProps} />
        </Svg>
      );

    case 'dataset':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3.5" y="3.5" width="17" height="17" rx="2.5" {...strokeProps} />
          <Rect
            x="7"
            y="7"
            width="4"
            height="4"
            rx="0.8"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth={1.6}
          />
          <Rect
            x="13"
            y="7"
            width="4"
            height="4"
            rx="0.8"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth={1.6}
          />
          <Rect
            x="7"
            y="13"
            width="4"
            height="4"
            rx="0.8"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth={1.6}
          />
          <Rect
            x="13"
            y="13"
            width="4"
            height="4"
            rx="0.8"
            fill={filled ? color : 'none'}
            stroke={color}
            strokeWidth={1.6}
          />
        </Svg>
      );

    case 'arrow_back_ios_new':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="15,5.5 8.5,12 15,18.5" {...strokeProps} strokeWidth={2.1} />
        </Svg>
      );

    case 'arrow_back':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="19" y1="12" x2="5" y2="12" {...strokeProps} strokeWidth={2} />
          <Polyline points="11,6 5,12 11,18" {...strokeProps} strokeWidth={2} />
        </Svg>
      );

    case 'badge':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="3" y="6" width="18" height="14" rx="2.2" {...strokeProps} />
          <Path d="M10 6V4.2A1.2 1.2 0 0 1 11.2 3h1.6A1.2 1.2 0 0 1 14 4.2V6" {...strokeProps} />
          <Circle cx="9" cy="12" r="1.6" {...strokeProps} />
          <Path d="M6.5 16.5c.5-1.3 1.5-2 2.5-2s2 .7 2.5 2" {...strokeProps} />
          <Line x1="14" y1="11.5" x2="18" y2="11.5" {...strokeProps} />
          <Line x1="14" y1="15" x2="17.5" y2="15" {...strokeProps} />
        </Svg>
      );

    case 'face':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="9" {...strokeProps} />
          <Path d="M4.5 10c2.2-.2 4.3-1.4 5.7-3.4 1.6 2 4.1 3.3 7.3 3.4" {...strokeProps} />
          <Circle cx="9" cy="13.2" r="1.1" fill={color} />
          <Circle cx="15" cy="13.2" r="1.1" fill={color} />
          <Path d="M9.5 16.5c.8.8 1.6 1.1 2.5 1.1s1.7-.3 2.5-1.1" {...strokeProps} />
        </Svg>
      );

    case 'verified':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 2.8l2.2 1.7 2.8-.2 1.1 2.5 2.5 1.1-.2 2.8 1.7 2.2-1.7 2.2.2 2.8-2.5 1.1-1.1 2.5-2.8-.2-2.2 1.7-2.2-1.7-2.8.2-1.1-2.5-2.5-1.1.2-2.8L2.8 12l1.7-2.2-.2-2.8 2.5-1.1 1.1-2.5 2.8.2L12 2.8Z"
            {...strokeProps}
            strokeWidth={1.65}
          />
          <Polyline points="8.8,12.2 11,14.4 15.6,9.6" {...strokeProps} strokeWidth={2} />
        </Svg>
      );

    case 'notifications_active':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M6.5 10.5a5.5 5.5 0 1 1 11 0c0 4 1.5 5.5 2 6H4.5c.5-.5 2-2 2-6Z"
            {...strokeProps}
          />
          <Path d="M10 18.5a2 2 0 0 0 4 0" {...strokeProps} />
          <Path d="M4.2 6.5a8.5 8.5 0 0 0-1.4 4" {...strokeProps} />
          <Path d="M19.8 6.5a8.5 8.5 0 0 1 1.4 4" {...strokeProps} />
        </Svg>
      );

    case 'mic_double':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="7" y="4" width="5" height="9" rx="2.5" {...strokeProps} />
          <Path d="M4.5 10.5a5 5 0 0 0 10 0" {...strokeProps} />
          <Line x1="9.5" y1="15.5" x2="9.5" y2="19.5" {...strokeProps} />
          <Path d="M16.5 7.5a3.5 3.5 0 0 1 0 6" {...strokeProps} />
          <Path d="M19 5.5a6.2 6.2 0 0 1 0 10" {...strokeProps} />
        </Svg>
      );

    case 'record_voice_over':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="9" cy="8.5" r="3.2" {...strokeProps} />
          <Path d="M3.5 19c0-3 2.4-4.8 5.5-4.8s5.5 1.8 5.5 4.8" {...strokeProps} />
          <Path d="M15.8 6.8a3.8 3.8 0 0 1 0 5.4" {...strokeProps} />
          <Path d="M18.5 4.6a7 7 0 0 1 0 9.8" {...strokeProps} />
        </Svg>
      );

    case 'usb':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="12" y1="4.5" x2="12" y2="18" {...strokeProps} />
          <Polyline points="9.5,7 12,4.5 14.5,7" {...strokeProps} />
          <Circle cx="12" cy="19" r="1.8" fill={color} />
          <Path d="M12 15.5l-4.5-2.5V10.5" {...strokeProps} />
          <Circle cx="7.5" cy="9.5" r="1.3" fill={color} />
          <Path d="M12 13.5l4.5-2.2V9.5" {...strokeProps} />
          <Rect x="15.2" y="7.5" width="2.6" height="2.6" rx="0.4" fill={color} />
        </Svg>
      );

    case 'battery_saver':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Rect x="7" y="5" width="10" height="16" rx="2" {...strokeProps} />
          <Line x1="10" y1="3" x2="14" y2="3" {...strokeProps} strokeWidth={2.2} />
          <Line x1="12" y1="10" x2="12" y2="16" {...strokeProps} />
          <Line x1="9" y1="13" x2="15" y2="13" {...strokeProps} />
        </Svg>
      );

    case 'menu':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1="4" y1="6.5" x2="20" y2="6.5" {...strokeProps} />
          <Line x1="4" y1="12" x2="20" y2="12" {...strokeProps} />
          <Line x1="4" y1="17.5" x2="15" y2="17.5" {...strokeProps} />
        </Svg>
      );

    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx="12" cy="12" r="8" {...strokeProps} />
        </Svg>
      );
  }
};
