#!/bin/bash

# Real-Time Collaborative Project Management Tool - Start Script
# This script starts both frontend and backend servers

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local pids=$(lsof -ti :$port)
    if [ ! -z "$pids" ]; then
        print_warning "Killing existing processes on port $port"
        echo $pids | xargs kill -9
        sleep 2
    fi
}

# Function to cleanup on script exit
cleanup() {
    print_warning "Shutting down servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    exit 0
}

# Set up trap for cleanup
trap cleanup SIGINT SIGTERM

# Check prerequisites
print_status "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_VERSION or higher"
    exit 1
fi

print_success "Prerequisites check passed"

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Check if directories exist
if [ ! -d "$BACKEND_DIR" ]; then
    print_error "Backend directory not found: $BACKEND_DIR"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    print_error "Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

# Check for package.json files
if [ ! -f "$BACKEND_DIR/package.json" ]; then
    print_error "Backend package.json not found"
    exit 1
fi

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    print_error "Frontend package.json not found"
    exit 1
fi

# Check and kill existing processes on default ports
print_status "Checking for existing processes..."
kill_port 3000  # Backend default port
kill_port 4200  # Angular default port

# Install dependencies if node_modules don't exist
print_status "Checking dependencies..."

if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    print_status "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install backend dependencies"
        exit 1
    fi
    print_success "Backend dependencies installed"
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    print_status "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install
    if [ $? -ne 0 ]; then
        print_error "Failed to install frontend dependencies"
        exit 1
    fi
    print_success "Frontend dependencies installed"
fi

# Start backend server
print_status "Starting backend server..."
cd "$BACKEND_DIR"

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning "Backend .env file not found. Creating a basic one..."
    cat > .env << EOF
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/project-management
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:4200
EOF
    print_warning "Please update the .env file with your actual configuration"
fi

# Start backend in background
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Backend server failed to start. Check backend.log for details."
    exit 1
fi

print_success "Backend server started (PID: $BACKEND_PID)"

# Start frontend server
print_status "Starting frontend server..."
cd "$FRONTEND_DIR"

# Start frontend in background
npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
print_status "Waiting for frontend server to start..."
sleep 10

# Check if frontend is running
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    print_error "Frontend server failed to start. Check frontend.log for details."
    cleanup
    exit 1
fi

print_success "Frontend server started (PID: $FRONTEND_PID)"

# Display server information
echo ""
echo "======================================"
print_success "Both servers are now running!"
echo "======================================"
echo ""
echo "🚀 Backend Server:"
echo "   URL: http://localhost:3000"
echo "   PID: $BACKEND_PID"
echo "   Logs: backend.log"
echo ""
echo "🌐 Frontend Server:"
echo "   URL: http://localhost:4200"
echo "   PID: $FRONTEND_PID"
echo "   Logs: frontend.log"
echo ""
echo "📋 Commands:"
echo "   - Press Ctrl+C to stop both servers"
echo "   - View backend logs: tail -f backend.log"
echo "   - View frontend logs: tail -f frontend.log"
echo ""
echo "🔧 Troubleshooting:"
echo "   - If ports are in use, the script will attempt to kill existing processes"
echo "   - Check log files if servers fail to start"
echo "   - Ensure MongoDB is running for backend functionality"
echo ""

# Keep the script running and wait for user to stop
print_status "Servers are running. Press Ctrl+C to stop both servers."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
