# Real-Time Collaborative Project Management Tool - Setup Guide

## 🚀 Quick Start Guide

This guide will help you set up and run the Real-Time Collaborative Project Management Tool on your local machine.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (Community Edition) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/)
- **Angular CLI** - Install globally: `npm install -g @angular/cli`

## 🛠️ Installation Steps

### 1. Clone and Setup Project Structure

The project is already set up with the following structure:
```
Real-Time Collaborative Project Management Tool/
├── backend/          # Node.js/Express API
├── frontend/         # Angular application
└── README.md
```

### 2. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

### 3. Database Setup

**Option A: Local MongoDB**
1. Start MongoDB service:
   ```bash
   # On macOS with Homebrew
   brew services start mongodb/brew/mongodb-community
   
   # On Windows
   net start MongoDB
   
   # On Linux
   sudo systemctl start mongod
   ```

**Option B: MongoDB Atlas (Free Cloud Database)**
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Get your connection string
4. Update the `MONGODB_URI` in backend/.env

### 4. Environment Configuration

The backend/.env file is already configured with default values:
```
MONGODB_URI=mongodb://localhost:27017/project-management
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
JWT_EXPIRE=7d
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:4200
```

**For production, change the JWT_SECRET to a secure random string!**

### 5. Start Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
🚀 Server running on port 3000
📊 Environment: development
🔗 API URL: http://localhost:3000/api
✅ MongoDB connected successfully
```

### 6. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
npm install
```

### 7. Start Frontend Application

```bash
npm start
# or
ng serve
```

The Angular application will start on http://localhost:4200

## 🎯 Testing the Application

### 1. API Health Check
Visit: http://localhost:3000/api/health

You should see:
```json
{
  "status": "OK",
  "message": "Project Management API is running",
  "timestamp": "2024-02-21T04:20:00.000Z"
}
```

### 2. Frontend Access
Visit: http://localhost:4200

The Angular application should load (you may see some console errors initially as we haven't created all components yet - this is normal for development).

## 📊 Database Schema

The application uses 5 main collections:

1. **users** - User accounts and authentication
2. **projects** - Project information and settings
3. **tasks** - Individual tasks within projects
4. **comments** - Comments on tasks and projects
5. **projectmembers** - Project membership and roles

## 🔧 Development Workflow

### Backend Development
```bash
cd backend
npm run dev  # Starts with nodemon for auto-restart
```

### Frontend Development
```bash
cd frontend
ng serve  # Starts with live reload
```

### API Testing
You can test the API endpoints using tools like:
- **Postman** - GUI for API testing
- **curl** - Command line tool
- **Thunder Client** - VS Code extension

Example API calls:

**Register a new user:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

## 🚀 Deployment

### Backend Deployment (Railway/Render)
1. Push code to GitHub
2. Connect your repository to Railway or Render
3. Set environment variables in the platform dashboard
4. Deploy automatically

### Frontend Deployment (Netlify)
1. Build the production version:
   ```bash
   cd frontend
   ng build --configuration production
   ```
2. Upload the `dist/` folder to Netlify
3. Configure redirects for Angular routing

### Database (MongoDB Atlas)
1. Create a free cluster on MongoDB Atlas
2. Update the `MONGODB_URI` environment variable
3. Whitelist your deployment platform's IP addresses

## 🔍 Troubleshooting

### Common Issues

**Backend won't start:**
- Check if MongoDB is running
- Verify the connection string in .env
- Ensure port 3000 is not in use

**Frontend compilation errors:**
- Run `npm install` in the frontend directory
- Check Angular CLI version: `ng version`
- Clear node_modules and reinstall if needed

**Database connection issues:**
- Verify MongoDB is running: `mongo` command
- Check firewall settings
- For Atlas: verify IP whitelist and credentials

**CORS errors:**
- Ensure CORS_ORIGIN in backend/.env matches frontend URL
- Check that both servers are running

### Getting Help

1. Check the console logs for detailed error messages
2. Verify all services are running (MongoDB, Backend, Frontend)
3. Test API endpoints individually
4. Check network connectivity

## 📚 Next Steps

After successful setup:

1. **Create your first user account** via the API or frontend
2. **Create a project** and add team members
3. **Add tasks** and test real-time updates
4. **Test Socket.io** real-time features
5. **Customize** the application for your needs

## 🎓 College Project Notes

This implementation demonstrates:
- **Full-stack development** with modern technologies
- **Real-time collaboration** using WebSockets
- **RESTful API design** with proper authentication
- **Database design** with relationships
- **Modern frontend** with Angular and Material UI
- **Deployment-ready** configuration

Perfect for demonstrating practical web development skills in a college project!

---

**Total Setup Time: ~15-30 minutes**
**Cost: ₹0 (All free technologies)**
