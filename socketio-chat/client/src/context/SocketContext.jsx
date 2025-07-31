import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children, username }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deletionState, setDeletionState] = useState({
    inProgress: false,
    error: null,
    success: false
  });

  useEffect(() => {
    if (!username) return;

    const newSocket = io('http://localhost:5000', {
      auth: { username },
      withCredentials: true
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for deletion errors from server
    newSocket.on('deleteError', (error) => {
      setDeletionState({
        inProgress: false,
        error: error.message,
        success: false
      });
      // Clear error after 3 seconds
      setTimeout(() => setDeletionState(prev => ({...prev, error: null})), 3000);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [username]);

  const deleteMessage = (messageId, deleteForEveryone = false) => {
    if (!socket || deletionState.inProgress) return;

    setDeletionState({
      inProgress: true,
      error: null,
      success: false
    });

    socket.emit('deleteMessage', { 
      messageId, 
      deleteForEveryone 
    }, (response) => {
      setDeletionState({
        inProgress: false,
        error: response?.error || null,
        success: !response?.error
      });
      
      // Clear success after 2 seconds
      if (!response?.error) {
        setTimeout(() => setDeletionState(prev => ({...prev, success: false})), 2000);
      }
    });
  };

  return (
    <SocketContext.Provider value={{ 
      socket, 
      isConnected,
      deleteMessage,
      deletionState
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);