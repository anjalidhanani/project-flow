# Real-Time Collaborative Project Management Tool

A full-stack web application built with Angular and Node.js that enables teams to collaborate on projects in real-time.

## 🚀 Features

- **User Authentication**: Secure login/register with JWT
- **Project Management**: Create, view, edit, and delete projects
- **Task Management**: Add, assign, update, and track tasks
- **Real-Time Updates**: See changes instantly with Socket.io
- **Team Collaboration**: Add members and collaborate in real-time
- **Dashboard**: Visual project overview with Chart.js
- **Comments System**: Team communication on tasks and projects

## 🛠️ Tech Stack

### Frontend
- **Angular 17** with TypeScript
- **Angular Material** for UI components
- **Socket.io-client** for real-time communication
- **Chart.js** for data visualization

### Backend
- **Node.js** with Express.js
- **Socket.io** for WebSocket connections
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcrypt** for password hashing

## 📊 Database Schema

The application uses 5 main collections:
1. **Users** - User accounts and profiles
2. **Projects** - Project information and settings
3. **Tasks** - Individual tasks within projects
4. **Comments** - Comments on tasks and projects
5. **ProjectMembers** - Project membership and roles

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- Angular CLI

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd real-time-project-management
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Configure your MongoDB connection and JWT secret
npm run dev
```

3. **Frontend Setup**
```bash
cd frontend
npm install
ng serve
```

4. **Access the application**
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000

## 📁 Project Structure

```
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── socket/
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── services/
│   │   │   └── models/
│   │   └── environments/
│   ├── package.json
│   └── angular.json
└── README.md
```

## 🔧 Environment Variables

Create a `.env` file in the backend directory:

```
MONGODB_URI=mongodb://localhost:27017/project-management
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
PORT=3000
NODE_ENV=development
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Projects
- `GET /api/projects` - Get user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/projects/:projectId/tasks` - Get project tasks
- `POST /api/projects/:projectId/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Comments
- `GET /api/tasks/:taskId/comments` - Get task comments
- `POST /api/tasks/:taskId/comments` - Add comment

## 🔄 Real-Time Events

### Socket.io Events
- `join-project` - Join project room
- `task-updated` - Task status/details changed
- `new-comment` - New comment added
- `member-joined` - New member added to project
- `project-updated` - Project details changed

## 🎨 UI Components

- **Dashboard** - Project overview with charts
- **Project List** - Grid view of all projects
- **Task Board** - Kanban-style task management
- **Task Details** - Individual task view with comments
- **User Profile** - User settings and information

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🚀 Deployment

### Frontend (Netlify)
```bash
cd frontend
ng build --prod
# Upload dist/ folder to Netlify
```

### Backend (Railway/Render)
```bash
cd backend
# Push to GitHub and connect to Railway/Render
```

### Database (MongoDB Atlas)
- Create free cluster on MongoDB Atlas
- Update connection string in environment variables

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Team

- **Frontend Developer**: Angular, TypeScript, Angular Material
- **Backend Developer**: Node.js, Express, MongoDB, Socket.io
- **Full-Stack Integration**: Real-time features and API integration

---

Built with ❤️ for college project demonstration
