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
      <style jsx>{`
        .header {
          width: 100%;
          background: linear-gradient(to right, #0e7f54ff, #8b5cf6);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          border-radius: 20px 20px 0 0;
        }
        
        .header-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .header-content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .app-title {
          font-size: 1.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 0;
          color: #ffffff;
        }
        
        .header-emoji {
          animation: pulse 2s infinite;
        }
        
        .app-name {
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        .welcome-message {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #e0e7ff;
          background-color: rgba(79, 70, 229, 0.3);
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
        }
        
        .username {
          font-weight: 500;
        }
        
        .logout-button {
          margin-left: 0.5rem;
          font-size: 0.75rem;
          background-color: rgba(255, 255, 255, 0.9);
          color: #4f46e5;
          padding: 0.25rem 0.5rem;
          border-radius: 9999px;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .logout-button:hover {
          background-color: white;
          transform: translateY(-1px);
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
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
      <style jsx>{`
        .footer {
          width: 100%;
          background: linear-gradient(to right, #1e293b, #0f172a);
          color: #e2e8f0;
          padding: 1.5rem 0;
          border-radius: 0 0 20px 20px;
          box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
          margin-top: auto;
        }
        
        .footer-container {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }
        
        .footer-content {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .footer-divider {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          width: 100%;
        }
        
        .divider-line {
          height: 1px;
          width: 5rem;
          background-color: #334155;
          flex-grow: 1;
          max-width: 4rem;
        }
        
        .divider-text {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #94a3b8;
          flex-shrink: 0;
        }
        
        .footer-info {
          text-align: center;
        }
        
        .copyright {
          font-size: 0.875rem;
          margin: 0;
          color: #cbd5e1;
        }
        
        .footer-links {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin: 0.5rem 0;
          font-size: 0.75rem;
        }
        
        .footer-link {
          color: #94a3b8;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        
        .footer-link:hover {
          color: #3dec3aff;
          transform: scale(1.250);
          text-decoration: underline;
          font-style:italic;
        }
        
        .footer-message {
          font-size: 0.75rem;
          color: #94a3b8;
          margin: 0.5rem 0 0;
        }
        
        .designer-credit {
          margin: 0.25rem 0 0;
        }
        
        .designer-link {
          font-size: 0.75rem;
          color: #94a3b8;
          text-decoration: none;
          transition: all 0.3s ease;
          display: inline-block;
        }
        
        .designer-link:hover {
          color: #3dec3aff;
          transform: scale(1.250);
          text-decoration: underline;
          font-style:italic;
        }
        .divider-text:hover {
          color: #5fb717ff;
          transform: scale(1.175);
          text-decoration: underline;
          font-style:italic;
          cursor:pointer;
        }
      `}</style>
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
      <style jsx>{`
        .layout {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        }
        
        .main-content {
          flex-grow: 1;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0;
        }
        
        @media (min-width: 768px) {
          .main-content {
            padding: 0;
          }
        }
      `}</style>
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