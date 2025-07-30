import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import { SocketProvider } from './context/SocketContext';
import './styles/Header.css';
import './styles/Footer.css';
import './styles/Layout.css';

function Header({ user, onLogout }) {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <h1 className="app-title">
            <span className="header-emoji">💬</span>
            <span className="app-name">Enhanced SocketIO Chat App</span>
          </h1>
          {user && (
            <div className="welcome-message">
              Welcome, <span className="username">{user.username}</span>!
              <button 
                onClick={onLogout}
                className="logout-button"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-divider">
            <span className="divider-line"></span>
            <span className="divider-text"></span>
             <a href="#" className="divider-text">Connect • Share • Chat</a>
            <span className="divider-line"></span>
          </div>
          
          <div className="footer-info">
            <p className="copyright">
              © {new Date().getFullYear()} Enhanced SocketIO Chat App. All rights reserved.
            </p>
            <div className="footer-links">
              <a href="https://github.com/j-captain" className="footer-link">Contact Developer</a>
            </div>
            <p className="footer-message">
              Made with ❤️ for seamless communication
            </p>
            <div className="designer-credit">
              <a 
                href="https://j-captain.github.io/PLP-HACKERTHON-KARANJA-PORTFOLIO/" 
                className="designer-link"
              >
                Designed by Mwangi Josphat Karanja
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Layout({ children, user, onLogout }) {
  return (
    <div className="layout">
      <Header user={user} onLogout={onLogout} />
      <main className="main-content">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const stored = localStorage.getItem('chatUser');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleAuthSuccess = (username) => {
    const userData = { username };
    setUser(userData);
    localStorage.setItem('chatUser', JSON.stringify(userData));
    navigate('/chat');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('chatUser');
    navigate('/');
  };

  return (
    <SocketProvider username={user?.username}>
      <Layout user={user} onLogout={handleLogout}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                user ? (
                  <Navigate to="/chat" replace />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="route-container"
                  >
                    <AuthPage onAuthSuccess={handleAuthSuccess} />
                  </motion.div>
                )
              }
            />
            <Route
              path="/chat"
              element={
                user ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="route-container"
                  >
                    <ChatPage username={user.username} onLogout={handleLogout} />
                  </motion.div>
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
          </Routes>
        </AnimatePresence>
      </Layout>
    </SocketProvider>
  );
}

export default function WrappedApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}