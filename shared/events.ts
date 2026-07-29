// ========================================
// @stay-away/shared — Константы WebSocket-событий
// Единый источник истины для бэкенда и фронтенда
// ========================================

export const SOCKET_EVENTS = {
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  RECONNECT_USER: 'reconnect_user',
  LEAVE_ROOM: 'leave_room',
  KICK_PLAYER: 'kick_player',
  KICKED: 'kicked',
  REPLACE_WITH_BOT: 'replace_with_bot',
  ADD_BOT: 'add_bot',
  SET_BOT_DELAY: 'set_bot_delay',
  START_GAME: 'start_game',
  RESTART_GAME: 'restart_game',
  DRAW_CARD: 'draw_card',
  PLAY_CARD: 'play_card',
  DISCARD_CARD: 'discard_card',
  OFFER_TRADE: 'offer_trade',
  ACCEPT_TRADE: 'accept_trade',
  DEFEND_ATTACK: 'defend_attack',
  CANCEL_TRADE_NO_THANKS: 'cancel_trade_no_thanks',
  CANCEL_TRADE_FEAR: 'cancel_trade_fear',
  REDIRECT_TRADE_MISS: 'redirect_trade_miss',
  RESOLVE_PANIC: 'resolve_panic',
  RESOLVE_PERSISTENCE: 'resolve_persistence',
  SEND_CHAT_MESSAGE: 'send_chat_message',
  CHAT_MESSAGE: 'chat_message',
  GAME_STATE_UPDATED: 'game_state_updated',
  REVEAL_EVENT: 'reveal_event',
  GAME_ERROR: 'game_error',
  TOGGLE_READY: 'toggle_ready',

  // События с двоеточием согласно спецификациям эпиков
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_STATE_UPDATED: 'room:state_updated',
  ROOM_RECONNECT: 'room:reconnect',
  ROOM_TOGGLE_READY: 'room:toggle_ready',
  PLAYER_AVATAR_UPDATE: 'player:avatar_update',
  'room:create': 'room:create',
  'room:join': 'room:join',
  'room:reconnect': 'room:reconnect',
  'room:state_updated': 'room:state_updated',
  'room:toggle_ready': 'room:toggle_ready',
  'player:avatar_update': 'player:avatar_update',
  'chat:message': 'chat:message',
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
