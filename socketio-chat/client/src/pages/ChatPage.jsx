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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, messageId: null });
  const typingTimeout = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const contextMenuRef = useRef(null);
  const readMessages = useRef(new Set());
  const [deletionInProgress, setDeletionInProgress] = useState(false);
  const { deleteMessage, deletionState } = useSocket();
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deletedMessageInfo, setDeletedMessageInfo] = useState(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenu]);


  {deletionState.error && (
  <div className="deletion-feedback error">
    {deletionState.error}
  </div>
)}

{deletionState.success && (
  <div className="deletion-feedback success">
    Message deleted successfully!
  </div>
)}

{deletionState.inProgress && (
  <div className="deletion-feedback progress">
    Deleting message...
  </div>
)}

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

      socket.on('roomHistory', history => {
        setMessages(history);
      });

      socket.on('message', msg => {
        if (msg.room === currentRoom) {
          setMessages(prev => [...prev, msg]);
          setTypingUsers(prev => prev.filter(u => u !== msg.username));
          
          // Mark message as read when received
          if (msg.username !== username) {
            socket.emit('messageRead', { messageId: msg._id });
          }
        }
      });

      socket.on('userJoined', ({ username: u, userCount }) => {
        if (u !== username) {
          setOnlineUsers(prev => [...new Set([...prev, u])]);
        }
      });

      socket.on('userLeft', ({ username: u, userCount }) => {
        setOnlineUsers(prev => prev.filter(user => user !== u));
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

      socket.on('readUpdate', ({ messageId, readBy }) => {
        setMessages(prev => prev.map(msg => 
          msg._id === messageId ? { ...msg, readBy } : msg
        ));
      });

      socket.on('messageDeleted', ({ messageId, deletedForEveryone, deletedFor }) => {
        if (deletedForEveryone) {
          setMessages(prev => prev.filter(msg => msg._id !== messageId));
        } else {
          setMessages(prev => prev.map(msg => 
            msg._id === messageId ? { ...msg, deletedFor } : msg
          ));
        }
      });

      socket.on('error', ({ message }) => {
        console.error('Socket error:', message);
      });
    };

    initSocketListeners();

    return () => {
      if (socket) {
        [
          'roomList', 'roomJoined', 'roomHistory', 'message', 
          'userJoined', 'userLeft', 'typing', 'stopTyping',
          'readUpdate', 'messageDeleted', 'error'
        ].forEach(evt => socket.off(evt));
      }
    };
  }, [socket, username, currentRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleContextMenu = (e, messageId) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      messageId
    });
  };

  const handleDeleteMessage = (deleteForEveryone = false) => {
    if (!contextMenu.messageId || deletionInProgress) return;
    
    setDeletionInProgress(true);
    
    socket.emit('deleteMessage', { 
        messageId: contextMenu.messageId, 
        deleteForEveryone 
    }, (response) => {
        setDeletionInProgress(false);
        if (response?.error) {
            alert(`Delete failed: ${response.error}`);
        }
    });
    
    setContextMenu({ ...contextMenu, visible: false });
};

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('zip')) return '🗄️';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFileMessage = (file) => {
    const canPreview = [
      'image/jpeg', 'image/png', 'image/gif', 
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/wav',
      'application/pdf'
    ].includes(file.type);

    return (
      <div className="file-message-container">
        <div className="file-header">
          <span className="file-icon">{getFileIcon(file.type)}</span>
          <div className="file-info">
            <div className="file-name">{file.name}</div>
            <div className="file-size">{formatFileSize(file.size)}</div>
          </div>
        </div>
        <div className="file-actions">
          <button 
            className="file-action-btn"
            onClick={() => window.open(file.url, '_blank')}
            disabled={!canPreview}
            title={canPreview ? "Open file" : "Preview not available"}
          >
            Open
          </button>
          <button 
            className="file-action-btn primary"
            onClick={() => {
              const a = document.createElement('a');
              a.href = file.url;
              a.download = file.name;
              a.click();
            }}
            title="Download file"
          >
            Download
          </button>
        </div>
        {canPreview && (
          <div className="file-preview">
            {file.type.startsWith('image/') && (
              <img src={file.url} alt={file.name} className="file-preview-image" />
            )}
            {file.type.startsWith('video/') && (
              <video controls className="file-preview-video">
                <source src={file.url} type={file.type} />
              </video>
            )}
            {file.type.startsWith('audio/') && (
              <audio controls className="file-preview-audio">
                <source src={file.url} type={file.type} />
              </audio>
            )}
            {file.type.includes('pdf') && (
              <iframe 
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`}
                title={file.name}
                className="file-preview-pdf"
              />
            )}
          </div>
        )}
      </div>
    );
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentRoom) return;

    try {
      setInputValue(`Uploading ${file.name}...`);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/upload', true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          socket.emit('sendMessage', {
            content: '',
            file: {
              url: response.url,
              name: response.name,
              type: response.type,
              size: response.size,
              icon: response.icon,
              canPreview: response.canPreview
            }
          });
          setInputValue('');
          setUploadProgress(0);
        } else {
          throw new Error('Upload failed');
        }
      };

      xhr.onerror = () => {
        throw new Error('Upload failed');
      };

      xhr.send(formData);
    } catch (err) {
      console.error('Upload error:', err);
      setInputValue('Upload failed');
      setUploadProgress(0);
      setTimeout(() => setInputValue(''), 2000);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const sendMessage = () => {
    if ((inputValue.trim() || fileInputRef.current?.files.length) && socket && currentRoom) {
      if (inputValue.trim()) {
        socket.emit('sendMessage', { 
          content: inputValue
        });
        setInputValue('');
      }
      handleStopTyping();
    }
  };

  const handleInputChange = e => {
    setInputValue(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', { room: currentRoom });
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(handleStopTyping, 3000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      socket.emit('stopTyping', { room: currentRoom });
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
      {/* Context Menu */}
      {contextMenu.visible && (
        <div 
          ref={contextMenuRef}
          className="context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 1000
          }}
        >
          <button 
            className="context-menu-item"
            onClick={() => handleDeleteMessage(false)}
          >
            Delete for me
          </button>
          <button 
            className="context-menu-item"
            onClick={() => {
              if (confirm('Are you sure you want to delete this message for everyone?')) {
                handleDeleteMessage(true);
              }
            }}
          >
            Delete for everyone
          </button>
          <button 
            className="context-menu-item"
            onClick={() => setContextMenu({ ...contextMenu, visible: false })}
          >
            Cancel
          </button>
        </div>
      )}

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
            
            {Array.from(new Set([...onlineUsers, username])).map((user) => (
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
                {messages.map((msg, i) => {
                  if (msg.deletedFor?.includes(username)) {
                    return null;
                  }

                  return (
                    <div 
                      key={msg._id || i} 
                      className={`message-row ${msg.username === username ? 'you' : 'other'}`}
                      onContextMenu={(e) => handleContextMenu(e, msg._id)}
                    >
                      <div className="message-bubble">
                        <div className="msg-user-label">
                          {msg.username === username ? 'You' : msg.username}
                          {msg.readBy?.includes(msg.username === username ? username : msg.username) && (
                            <span className="read-receipt">✓✓</span>
                          )}
                        </div>
                        <div className="msg-text">
                          {msg.content}
                          {msg.file && renderFileMessage(msg.file)}
                        </div>
                        <div className="msg-meta">
                          <div className="msg-time">
                            {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="chat-input-container">
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress">
                <div 
                  className="upload-progress-bar" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
                <span>Uploading: {uploadProgress}%</span>
              </div>
            )}
            <div className="input-row">
              <button 
                className="file-input-btn"
                onClick={() => fileInputRef.current.click()}
                title="Upload file"
                disabled={!currentRoom}
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
                onChange={handleFileUpload}
                accept="audio/*,video/*,image/*,.pdf,.ppt,.pptx,.doc,.docx,.zip"
                disabled={!currentRoom}
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
                disabled={(!inputValue.trim() && (!fileInputRef.current || fileInputRef.current.files.length === 0)) || !currentRoom}
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