#!/bin/bash

# Real-Time Collaborative Project Management Tool - Setup Script
# This script sets up the complete development environment

echo "🚀 Setting up Real-Time Collaborative Project Management Tool..."
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB is not installed locally. You can:"
    echo "   1. Install MongoDB Community Edition"
    echo "   2. Use MongoDB Atlas (cloud database)"
    echo "   3. Continue setup and configure database later"
    read -p "Continue setup? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Setup Backend
echo "📦 Setting up Backend..."
cd backend

# Install backend dependencies
echo "Installing backend dependencies..."
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating backend .env file..."
    cp .env.example .env
    echo "✅ Backend .env file created. Please update MongoDB connection string if needed."
fi

echo "✅ Backend setup complete!"

# Setup Frontend
echo "📦 Setting up Frontend..."
cd ../frontend

# Install Angular CLI globally if not installed
if ! command -v ng &> /dev/null; then
    echo "Installing Angular CLI globally..."
    npm install -g @angular/cli
fi

# Install frontend dependencies
echo "Installing frontend dependencies..."
npm install

echo "✅ Frontend setup complete!"

# Go back to root directory
cd ..

echo "🎉 Setup Complete!"
echo "=================================================="
echo "Next steps:"
echo "1. Start MongoDB (if using local installation):"
echo "   - macOS: brew services start mongodb/brew/mongodb-community"
echo "   - Windows: net start MongoDB"
echo "   - Linux: sudo systemctl start mongod"
echo ""
echo "2. Start the backend server:"
echo "   cd backend && npm run dev"
echo ""
echo "3. Start the frontend application (in a new terminal):"
echo "   cd frontend && npm start"
echo ""
echo "4. Open your browser and go to:"
echo "   - Frontend: http://localhost:4200"
echo "   - Backend API: http://localhost:3000/api/health"
echo ""
echo "📚 For detailed setup instructions, see SETUP.md"
echo "🚀 For deployment instructions, see DEPLOYMENT.md"
echo ""
echo "Happy coding! 🎯"
