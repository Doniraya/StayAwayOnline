import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Radio, ChevronDown, ChevronUp, ScrollText } from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';

export default function InGameChat() {
  const [inputText, setInputText] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'log'>('chat');
  const chatMessages = useGameStore((s) => s.chatMessages);
  const handleSendChatMessage = useGameStore((s) => s.handleSendChatMessage);
  const gameState = useGameStore((s) => s.gameState);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const controlledPlayerId = useGameStore((s) => s.controlledPlayerId);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activePlayerId = controlledPlayerId || myPlayerId;

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, gameState?.log]);

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

  return (
    <div
      className={`relative z-40 w-full transition-all duration-300 ${
        isCollapsed ? 'h-12' : 'h-80'
      } flex flex-col rounded-xl border border-slate-700/60 bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-slate-950 shadow-2xl backdrop-blur-md overflow-hidden border-t-slate-600/50`}
      style={{
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Шапка чата — тёмно-металлический блок */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-slate-800/90 via-slate-900/90 to-slate-800/90 border-b border-slate-700/50 cursor-pointer select-none">
        <div
          className="flex items-center gap-2 text-slate-200 hover:text-amber-400 transition"
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
          {/* Табы Переключения */}
          {!isCollapsed && (
            <div className="flex bg-slate-950/80 rounded p-0.5 border border-slate-800 mr-1">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded transition flex items-center gap-1 ${
                  activeTab === 'chat'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3 h-3" /> Чат
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('log')}
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

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-slate-400 hover:text-slate-100 p-1 rounded transition"
            title={isCollapsed ? 'Развернуть чат' : 'Свернуть чат'}
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Основная часть при развернутом состоянии */}
      {!isCollapsed && (
        <>
          {/* Содержимое чата или лога */}
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
            ) : (
              /* Системный лог */
              gameState?.log && gameState.log.length > 0 ? (
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
              )
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Форма ввода сообщения */}
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
}
