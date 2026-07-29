import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Radio, ChevronDown, ChevronUp, ScrollText, X } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export default function InGameChat() {
  const [inputText, setInputText] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'log'>('chat');

  const chatMessages = useGameStore((s) => s.chatMessages);
  const handleSendChatMessage = useGameStore((s) => s.handleSendChatMessage);
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activePlayerId = controlledPlayerId || myPlayerId;

  const [unreadCount, setUnreadCount] = useState(0);
  const prevChatCountRef = useRef(chatMessages.length);

  // Автоскролл и подсчет непрочитанных сообщений
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (chatMessages.length < prevChatCountRef.current) {
      setUnreadCount(0);
    } else if (
      (activeTab === 'log' || isCollapsed || !isMobileOpen) &&
      chatMessages.length > prevChatCountRef.current
    ) {
      setUnreadCount((prev) => prev + (chatMessages.length - prevChatCountRef.current));
    }
    prevChatCountRef.current = chatMessages.length;
  }, [chatMessages, activeTab, isCollapsed, isMobileOpen]);

  const handleTabChange = (tab: 'chat' | 'log') => {
    setActiveTab(tab);
    if (tab === 'chat') {
      setUnreadCount(0);
    }
  };

  const openMobileChat = () => {
    setIsMobileOpen(true);
    setUnreadCount(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    handleSendChatMessage(inputText);
    setInputText('');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Содержимое чата
  const renderChatBody = () => (
    <div
      className="w-full h-full flex flex-col rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-slate-950 shadow-2xl backdrop-blur-md overflow-hidden border-t-slate-600/50"
      style={{
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Шапка чата */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-800/90 via-slate-900/90 to-slate-800/90 border-b border-slate-700/50 select-none">
        <div
          className="flex items-center gap-2 text-slate-200 hover:text-amber-400 transition cursor-pointer"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <div className="relative">
            <Radio className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <span className="text-xs font-bold tracking-wider uppercase font-special-elite text-amber-400/90">
            Радиоэфир
          </span>
          {chatMessages.length > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-500/30">
              {chatMessages.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Табы */}
          {!isCollapsed && (
            <div className="flex bg-slate-950/80 rounded p-0.5 border border-slate-800 mr-1">
              <button
                type="button"
                onClick={() => handleTabChange('chat')}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded transition flex items-center gap-1 relative ${
                  activeTab === 'chat'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3 h-3" />
                <span>Чат</span>
                {unreadCount > 0 && (
                  <span className="ml-0.5 bg-amber-500 text-slate-950 font-black text-[9px] px-1 rounded-full animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('log')}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded transition flex items-center gap-1 ${
                  activeTab === 'log'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ScrollText className="w-3 h-3" /> Лог
              </button>
            </div>
          )}

          {/* Кнопка свертывания для десктопа */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:block text-slate-400 hover:text-slate-100 p-1 rounded transition"
            title={isCollapsed ? 'Развернуть чат' : 'Свернуть чат'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {/* Кнопка закрытия для мобильных */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-100 p-1 rounded transition"
            title="Закрыть"
          >
            <X className="w-5 h-5 text-amber-400" />
          </button>
        </div>
      </div>

      {/* Содержимое развернутого чата */}
      {!isCollapsed && (
        <>
          <div className="flex-1 p-2.5 overflow-y-auto space-y-2 text-xs scrollbar-thin scrollbar-thumb-slate-700">
            {activeTab === 'chat' ? (
              chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 italic text-[11px] space-y-1">
                  <Radio className="w-6 h-6 opacity-30 text-slate-400" />
                  <span>В эфире тишина... Отправьте сообщение.</span>
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderId === activePlayerId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className={`font-semibold ${isMe ? 'text-amber-400' : 'text-slate-300'}`}>
                          {msg.senderName}
                        </span>
                        <span className="text-[9px] text-slate-500">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div
                        className={`px-2.5 py-1.5 rounded-lg max-w-[85%] break-words ${
                          isMe
                            ? 'bg-amber-950/60 border border-amber-700/40 text-amber-100 rounded-tr-none'
                            : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )
            ) : gameState?.log && gameState.log.length > 0 ? (
              gameState.log.map((logEntry, idx) => (
                <div
                  key={idx}
                  className="p-1.5 rounded bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300 font-mono flex items-start gap-1.5"
                >
                  <span className="text-amber-500 font-bold select-none">•</span>
                  <span>{logEntry}</span>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 italic text-[11px]">
                Лог событий пуст
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-2 bg-slate-950/90 border-t border-slate-800/80 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Написать в радиоэфир..."
              className="flex-1 bg-slate-900 border border-slate-700/70 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/50 transition"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 disabled:hover:from-amber-600 disabled:hover:to-amber-700 text-slate-950 font-bold p-1.5 rounded-lg transition border border-amber-400/30 flex items-center justify-center shadow-md"
              title="Отправить сообщение"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* 1. Плавающая кнопка-триггер для мобильных устройств (< 1024px) */}
      <div className="fixed bottom-4 left-4 z-40 lg:hidden">
        <button
          type="button"
          onClick={openMobileChat}
          className="relative p-3 rounded-full bg-slate-900/90 border border-amber-500/50 text-amber-400 shadow-2xl backdrop-blur-md active:scale-95 transition flex items-center justify-center"
          title="Открыть чат радиоэфира"
        >
          <Radio className="w-6 h-6 animate-pulse text-amber-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-extrabold text-[10px] px-1.5 py-0.5 rounded-full border border-amber-300 shadow animate-bounce">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. Мобильная выезжающая шторка (Bottom Sheet Drawer) с оверлеем-затемнением */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-end p-2 lg:hidden transition-all duration-300"
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="w-full h-[75vh] max-h-[500px] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Полоса-индикатор перетаскивания */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-2 opacity-60" />
            {renderChatBody()}
          </div>
        </div>
      )}

      {/* 3. Фиксированная боковая панель для десктопа (≥ 1024px) */}
      <div
        className={`hidden lg:flex relative z-40 w-full transition-all duration-300 ${
          isCollapsed ? 'h-12' : 'h-80'
        } flex-col`}
      >
        {renderChatBody()}
      </div>
    </>
  );
}
