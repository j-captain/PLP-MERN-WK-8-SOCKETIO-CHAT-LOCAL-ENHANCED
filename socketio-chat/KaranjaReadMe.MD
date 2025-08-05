# MWANGI JOSPHAT KARANJA  WK 8 MERN Stack Capstone Project - Enhanced Real-Time Chat Application with Socket.io

A full-stack real-time chat application built with React.js, Node.js, Express.js, MongoDB, and Socket.io. This application features real-time messaging, user presence indicators, typing notifications, and more.

 
**🌟 Features**
**💬 Core Chat Functionality**
Real-time messaging with Socket.IO
Multiple concurrent chat rooms
Message history persistence
Typing indicators
Read receipts

**🔐 Authentication**
User registration and login
Password hashing with bcrypt
Session management

**🖼️ Media Support**
File uploads (images, documents)
10MB file size limit
File type detection
Downloadable files

**🛠️ Admin Features**
Socket.IO admin UI
Connection monitoring
Room management

User activity tracking

**🎨 UI/UX**
Responsive design
Color-coded console logging
ASCII art banners
Connection status indicators

**🛠️ Technology Stack**
Component	Technology
Frontend	React, Vite, Tailwind CSS
Backend	Node.js, Express
Real-Time	Socket.IO
Database	MongoDB (Atlas for production)
Authentication	Session-based with bcrypt
File Storage	Local filesystem (production-ready)
 

### Frontend
- React.js (Vite)
- Socket.io-client
- Tailwind CSS v3
- React Icons
- React Router

### Backend
- Node.js
- Express.js
- Socket.io
- MongoDB (Mongoose)
- Multer (for file uploads)
- JWT (for authentication)

## Installation

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local or Atlas URI)
- Git

### Backend Setup

1. Navigate to the server directory:
 
cd server
 

2. Install backend dependencies:
 
npm install express socket.io mongoose cors dotenv jsonwebtoken bcryptjs multer path
 

3. Create a `.env` file in the server directory with the following variables:
 
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173
PORT=5000
 

4. Start the backend server:
 
npm run dev
 

### Frontend Setup

1. Navigate to the client directory:
 
cd client
 

2. Install frontend dependencies:
 
npm install socket.io-client react-router-dom react-icons jwt-decode react-feather
npm install tailwindcss @tailwindcss/vite


3. Create a `.env` file in the client directory:
 
VITE_API_BASE_URL=http://localhost:5000
 

4. Start the frontend development server:
 
npm run dev
 

## Project Structure

### Backend
```
server/
├── config/
│   └── db.js            # Database connection
├── controllers/
├── models/
│   ├── User.js          # User model
│   ├── Message.js       # Message model
│   └── Room.js          # Chat room model
├── socket/
│   ├── auth.js          # Socket authentication
│-  └── chat.js          # Socket event handlers
|----tests
├── utils/
├── server.js            # Main server file
└── package.json
```

### Frontend
```
client/
├── public/
├── src/
│   ├── components/
│   │   ├── MessageInput.jsx
│   │   ├── MessageList.jsx
│   │   └── OnlineUsers.jsx
|   |---tests
│   ├── context/
│   │   └── SocketContext.jsx
│   ├── hooks/
│   ├── pages/
│   │   └── ChatPage.jsx
│   ├── socket/
│   │   └── socket.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .eslintrc.cjs
├── index.html
├── package.json
└── tailwind.config.js
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login an existing user

### File Upload
- `POST /api/upload` - Upload files (images/documents)

## Socket.io Events

### Server Emits
- `new_message` - When a new message is received
- `previous_messages` - When a user joins a room
- `typing` - When a user is typing
- `user_list` - List of online users
- `private_room_created` - When a private chat is created
- `message_read` - When a message is read by a user

### Client Emits
- `send_message` - Send a new message
- `join_room` - Join a chat room
- `start_private_chat` - Start a private chat
- `mark_as_read` - Mark a message as read
- `typing` - Notify when user is typing

## Troubleshooting

1. **Socket connection issues**:
   - Verify CORS settings
   - Check environment variables
   - Ensure both client and server are running

2. **File uploads not working**:
   - Create the `uploads` directory in server root
   - Check file size and type restrictions
   - Verify Multer configuration

3. **Tailwind CSS not applying**:
   - Check import in vite.config.js
   - Verify `index.css` contains Tailwind directives
   - Restart the Vite dev server

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Create a new Pull Request


**screenshots**

![image1](<Screenshot (106).png>)
 ![image2](<Screenshot (100).png>) 
 ![image3](<Screenshot (101).png>)
  ![image4](<Screenshot (102).png>) 
  ![image5](<Screenshot (103).png>) 
  ![image6](<Screenshot (104).png>)
   ![image7](<Screenshot (105).png>)


**🌐 DEPLOYMENT**
Render Backened URL: `https://plp-mern-wk-7-socketio-chat-render.onrender.com` 
Render Frontend URL: `https://plp-mern-wk-7-socketio-chat-render-b9o3.onrender.com`
Gamma Pitch Deck Link: `https://gamma.app/docs/Enhanced-Socketio-ChatApppptx-zgvvz2die0ukj91`

**🛡️ Security Features**
CORS protection with whitelisted origins
Password hashing with bcrypt
File type validation
Rate limiting (recommended addition)
HTTPS enforced in production

**📈 Performance**
WebSocket and polling fallback
Connection state recovery
Message batching
Efficient database queries
File size limits

**🤝 Contributing**
Fork the project

Create your feature branch (git checkout -b feature/AmazingFeature)
Commit your changes (git commit -m 'Add some AmazingFeature')
Push to the branch (git push origin feature/AmazingFeature)
Open a Pull Request

**📜 License**
Distributed under the MIT License. See LICENSE for more information.

**✉️ Contact**
Project Maintainer - j-captain


**Explanation of server dev dependencies:**

jest: Test runner
jest-environment-node: Node environment for Jest
socket.io-client: To test Socket.io connections
supertest: For HTTP endpoint testing
@sentry/node: Error tracking
cross-env: For cross-platform environment variables


**Explanation of client dev dependencies:**

jest: Test runner
@testing-library/*: React component testing utilities
@sentry/browser: Client-side error tracking
cypress: End-to-end testing
jest-axe: Accessibility testing
eslint-plugin-jsx-a11y: Accessibility linting


**TESTING:SERVER**
npm test

**Run tests in watch mode (during development):**
npm run test:watch

**Generate coverage report:**
npm run test:coverage

**Run end-to-end tests:**
npm run e2e - For interactive mode
npm run e2e:headless - For CI

**Initialize it with:**
npx cypress open

**Running the tests with more verbose output:**
npm run test:coverage -- --verbose
npm run test:debug

**TESTING:CLIENT**
**Run unit tests:**
npm run test:unit

**Run Accessibility Tests:**
npm run test:a11y

**Run All Tests:**
npm run test:all

**Run end-to-end tests:**
npm run e2e - For interactive mode
npm run e2e:headless - For CI

**Run tests in watch mode**
npm run test:watch

npm run test:unit -- --verbose

**Running the tests Independently**
- npm test AuthForm.test.jsx
- npm test Loading.test.jsx
- npm test MessageList.test.jsx
- npm test OnlineUsers.test.jsx
- npm run test RegisterForm.test.jsx
- npm test MessageInput.test.jsx
- npm test Authpage.test.jsx
- npm test ChatPage.test.jsx


**Running the tests sequentially: One after the other**
npm test AuthForm.test.jsx && ^
npm test Loading.test.jsx && ^
npm test MessageList.test.jsx && ^
npm test OnlineUsers.test.jsx && ^
npm test RegisterForm.test.jsx && ^
npm test MessageInput.test.jsx && ^
npm test AuthPage.test.jsx && ^
npm test ChatPage.test.jsx

**Option Two":**
npm test AuthForm.test.jsx Loading.test.jsx MessageList.test.jsx OnlineUsers.test.jsx RegisterForm.test.jsx MessageInput.test.jsx AuthPage.test.jsx ChatPage.test.jsx

**Option Three:Windows Powershell Approach 1**
npm test AuthForm.test.jsx; `
npm test Loading.test.jsx; `
npm test MessageList.test.jsx; `
npm test OnlineUsers.test.jsx; `
npm test RegisterForm.test.jsx; `
npm test MessageInput.test.jsx; `
npm test AuthPage.test.jsx; `
npm test ChatPage.test.jsx

**Changing Windows Powershell Execution Policy**
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

**Reverting to default Windows Powershell Execution Policy**
Set-ExecutionPolicy Restricted -Scope CurrentUser

**Verify the Change**
Get-ExecutionPolicy -List

**Option Four:Windows Powershell Approach 2**
**Run Without Changing Policy**
& "C:\Program Files\nodejs\npm.cmd" test AuthForm.test.jsx
& "C:\Program Files\nodejs\npm.cmd" test Loading.test.jsx
& "C:\Program Files\nodejs\npm.cmd" test MessageList.test.jsx
& "C:\Program Files\nodejs\npm.cmd" test OnlineUsers.test.jsx
& "C:\Program Files\nodejs\npm.cmd" test RegisterForm.test.jsx
& "C:\Program Files\nodejs\npm.cmd" test MessageInput.test.jsx
& "C:\Program Files\nodejs\npm.cmd" test AuthPage.test.jsx
& "C:\Program Files\nodejs\npm.cmd" test ChatPage.test.jsx


**Option Five:Windows Powershell Approach 3**
**Run All Tests in One Command**
& "C:\Program Files\nodejs\npm.cmd" test AuthForm.test.jsx Loading.test.jsx MessageList.test.jsx OnlineUsers.test.jsx RegisterForm.test.jsx MessageInput.test.jsx AuthPage.test.jsx ChatPage.test.jsx


**Sometimes, port 5000 is in use due to conflict in development,testing ,production and deployment**

netstat -ano | findstr :5000
taskkill /PID 'PID' /F

**Verify your Jest configuration**
npx jest --showConfig

**Common useful commands:**
npx jest --showConfig	Show full resolved config
npx jest --listTests	List all test files Jest finds
npx jest --clearCache	Clear Jest cache if having issues
npx jest --coverage	Generate coverage report
npx jest --watch	Watch mode for development

