import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import '../styles/ChatPage.css';

export default function ChatPage({ username, onLogout }) {
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const readMessages = useRef(new Set());

  useEffect(() => {
    if (!socket) return;

    socket.emit('setUsername', username);
    socket.emit('getRoomList');

    const initSocketListeners = () => {
      socket.on('roomList', roomList => {
        setRooms(roomList);
        if (!currentRoom && roomList.length) {
          const initialRoom = roomList[0].name;
          socket.emit('joinRoom', { roomName: initialRoom, username });
        }
      });

      socket.on('roomJoined', room => {
        setCurrentRoom(room.name);
        setMessages([]);
      });

      socket.on('message', msg => {
        if (msg.room === currentRoom) {
          setMessages(prev => [...prev, msg]);
          setTypingUsers(prev => prev.filter(u => u !== msg.username));
        }
      });

      socket.on('userConnection', data => {
        setOnlineUsers(prev => {
          const s = new Set(prev);
          data.status === 'online' ? s.add(data.username) : s.delete(data.username);
          return [...s];
        });
      });

      socket.on('typing', ({ username: u, room }) => {
        if (room === currentRoom && u !== username) {
          setTypingUsers(prev => (prev.includes(u) ? prev : [...prev, u]));
        }
      });

      socket.on('stopTyping', ({ username: u, room }) => {
        if (room === currentRoom) {
          setTypingUsers(prev => prev.filter(x => x !== u));
        }
      });
    };

    initSocketListeners();

    return () => {
      if (socket) {
        ['roomList', 'roomJoined', 'message', 'userConnection', 'typing', 'stopTyping']
          .forEach(evt => socket.off(evt));
      }
    };
  }, [socket, username, currentRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (inputValue.trim() && socket && currentRoom) {
      socket.emit('sendMessage', { 
        content: inputValue, 
        room: currentRoom,
        username
      });
      setInputValue('');
      handleStopTyping();
    }
  };

  const handleInputChange = e => {
    setInputValue(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { room: currentRoom, username });
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(handleStopTyping, 3000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      socket.emit('stopTyping', { room: currentRoom, username });
    }
    clearTimeout(typingTimeout.current);
  };

  const joinRoom = roomName => {
    if (socket && roomName && roomName !== currentRoom) {
      socket.emit('joinRoom', { roomName, username });
    }
  };

  const createRoom = roomName => {
    const name = roomName?.trim();
    if (socket && name) {
      socket.emit('createRoom', { roomName: name, username });
    }
  };

  return (
    <div className="chat-app">
      <div className="chat-container">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Chat Rooms</h2>
            {isConnected
              ? <span className="status online">Online</span>
              : <span className="status offline">Offline</span>}
          </div>
          
          <div className="sidebar-body">
            <div className="room-header">
              <h3>Rooms</h3>
              <button onClick={() => {
                const roomName = prompt("Enter new room name:");
                createRoom(roomName);
              }}>
                + New
              </button>
            </div>
            
            {rooms.map((room) => (
              <div
                key={room.name}
                className={`room-item ${currentRoom === room.name ? 'active' : ''}`}
                onClick={() => joinRoom(room.name)}
              >
                <span className="dot"></span>
                {room.name}
                <span className="count">{room.userCount || 0}</span>
              </div>
            ))}
            
            <div className="users-header">
              <h3>Online Users</h3>
            </div>
            
            {onlineUsers.map((user) => (
              <div key={user} className="user-item">
                <span className={`dot ${user === username ? '' : 'user-online'}`}></span>
                {user}{user === username ? ' (You)' : ''}
                {typingUsers.includes(user) && (
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="sidebar-footer">
            <div className="profile">
              <div className="avatar">{username.charAt(0).toUpperCase()}</div>
              <div>
                <div>{username}</div>
                <button 
                  onClick={onLogout} 
                  className="logout-btn"
                  aria-label="Sign out"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section className="main-chat">
          <div className="chat-header">
            <h1>{currentRoom || 'Select a room'}</h1>
            <div className="summary">
              <span>{messages.length} messages</span>
              <span>•</span>
              <span>{onlineUsers.length} online</span>
            </div>
          </div>

          <div className="messages" ref={messagesContainerRef}>
            {messages.length === 0 ? (
              <div className="no-messages">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>No messages yet</p>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`message-row ${msg.username === username ? 'you' : 'other'}`}
                  >
                    <div className="message-bubble">
                      <div className="msg-user-label">
                        {msg.username === username ? 'You' : msg.username}
                      </div>
                      <div className="msg-text">
                        {msg.content}
                      </div>
                      <div className="msg-time">
                        {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="chat-input-container">
            <div className="input-row">
              <button 
                className="file-input-btn"
                onClick={() => fileInputRef.current.click()}
                title="Upload file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </button>
              <input
                type="file"
                ref={fileInputRef}
                className="file-input"
                onChange={() => {}}
                accept="audio/*,video/*,image/*,.pdf,.ppt,.pptx,.doc,.docx"
              />
              <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                onBlur={handleStopTyping}
                placeholder={`Message in ${currentRoom || 'room'}...`}
                disabled={!currentRoom}
              />
              <button 
                onClick={sendMessage} 
                disabled={!inputValue.trim() || !currentRoom}
                title="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
            {isTyping && (
              <div className="typing-status">
                <span>You're typing</span>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}