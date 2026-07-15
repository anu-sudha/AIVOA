import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addUserMessage, sendMessage } from '../store/chatSlice';

export default function ChatPanel() {
  const dispatch = useDispatch();
  const { messages, status } = useSelector((s) => s.chat);
  const [draft, setDraft] = useState('');

  const onSend = () => {
    if (!draft.trim()) return;
    dispatch(addUserMessage(draft));
    dispatch(sendMessage(draft));
    setDraft('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') onSend();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e6e8ec' }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>🤖 AI Assistant</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>Log interaction via chat</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              background: m.role === 'user' ? '#2563eb' : '#eef1f5',
              color: m.role === 'user' ? '#fff' : '#1a1d29',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 13,
              maxWidth: '85%',
            }}
          >
            {m.text}
            {m.toolCalls && m.toolCalls.length > 0 && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                tool(s) used: {m.toolCalls.join(', ')}
              </div>
            )}
          </div>
        ))}
        {status === 'sending' && <div style={{ fontSize: 12, color: '#6b7280' }}>Agent is thinking...</div>}
      </div>

      <div style={{ padding: 14, borderTop: '1px solid #e6e8ec', display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Describe interaction..."
          style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #d8dce3', fontSize: 13 }}
        />
        <button
          onClick={onSend}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 16px', fontWeight: 600 }}
        >
          Log
        </button>
      </div>
    </div>
  );
}
