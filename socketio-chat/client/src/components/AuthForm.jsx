import { useState } from 'react';

export default function AuthForm({ onAuth, error, setError }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');

    await onAuth(username, password, isLogin);
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="auth-container">
        <header className="auth-header">
          <h2 className="auth-subtitle">
            {isLogin ? 'Sign In to Continue' : 'Create Your Account'}
          </h2>
        </header>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="form-input"
              placeholder="Enter your username"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength="6"
              className="form-input"
              placeholder="Enter your password"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="submit-button"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register'}
            </button>
          </div>
        </form>

        <div className="auth-toggle">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="toggle-button"
          >
            {isLogin ? 'Need an account? Register' : 'Already have an account? Sign In'}
          </button>
        </div>

        <style jsx>{`
          .page-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: calc(100vh - 120px);
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          }
          
          .auth-container {
            width: 100%;
            max-width: 30rem; /* Slightly wider container */
            padding: 2rem; /* More padding inside the form */
            background-color: #ffffff;
            border-radius: 1rem;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 
                        0 10px 10px -5px rgba(0, 0, 0, 0.04);
            margin: 0 auto;
            animation: fadeIn 0.3s ease-out;
          }
          
          .auth-header {
            text-align: center;
            margin-bottom: 1.5rem; /* More space below header */
          }
          
          .auth-subtitle {
            font-style: italic;
            font-weight: bolder;
            font-size: 1.3rem; /* Slightly larger subtitle */
            color: #4f46e5;
            margin: 0;
          }
          
          .error-message {
            padding: 0.75rem;
            font-size: 0.875rem;
            color: #b91c1c;
            background-color: #fee2e2;
            border-radius: 0.375rem;
            margin-bottom: 1.25rem; /* More space below error */
            text-align: center;
          }
          
          .auth-form {
            display: flex;
            flex-direction: column;
            gap: 1.25rem; /* More space between form elements */
          }
          
          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem; /* More space between label and input */
          }
          
          .form-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #475569;
          }
          
          .form-input {
            width: 100%;
            padding: 0.75rem; /* More comfortable input padding */
            border: 1px solid #e2e8f0;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            transition: all 0.2s ease;
            background-color: #f8fafc;
            box-sizing: border-box;
          }
          
          .form-input:focus {
            outline: none;
            border-color: #818cf8;
            box-shadow: 0 0 0 3px rgba(129, 140, 248, 0.2);
            background-color: #ffffff;
          }
          
          .form-input::placeholder {
            color: #94a3b8;
            opacity: 0.7;
          }
          
          .submit-button {
            width: 100%;
            padding: 0.75rem;
            background: linear-gradient(to right, #4f46e5, #7c3aed);
            color: white;
            border: none;
            border-radius: 0.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 0.75rem; /* More space above button */
            box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2), 
                        0 2px 4px -1px rgba(79, 70, 229, 0.1);
          }
          
          .submit-button:hover {
            background: linear-gradient(to right, #4338ca, #6d28d9);
            transform: translateY(-1px);
            box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.2), 
                        0 4px 6px -2px rgba(79, 70, 229, 0.1);
          }
          
          .submit-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
            background: #cbd5e1;
            box-shadow: none;
          }
          
          .auth-toggle {
            text-align: center;
            margin: 1.25rem 0 0; /* More space above toggle */
            font-size: 0.875rem;
          }
          
          .toggle-button {
            color: #4f46e5;
            font-weight: 500;
            background: none;
            border: none;
            padding: 0;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .toggle-button:hover {
            color: #4338ca;
            text-decoration: underline;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}