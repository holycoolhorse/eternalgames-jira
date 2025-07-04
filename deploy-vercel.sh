#!/bin/bash

# Vercel Deployment Script for EternalGames Jira
# This script prepares and deploys the application to Vercel

echo "🚀 Starting Vercel Deployment Process..."

# Color codes for output
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

# Check if required commands exist
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "git is not installed. Please install git first."
        exit 1
    fi
    
    print_success "All dependencies are installed."
}

# Install all dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    npm install
    
    # Install backend dependencies
    cd backend
    npm install
    cd ..
    
    # Install frontend dependencies
    cd frontend
    npm install
    cd ..
    
    print_success "All dependencies installed successfully."
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    
    cd frontend
    npm run build
    
    if [ $? -eq 0 ]; then
        print_success "Frontend built successfully."
    else
        print_error "Frontend build failed."
        exit 1
    fi
    
    cd ..
}

# Test backend
test_backend() {
    print_status "Testing backend..."
    
    cd backend
    node -e "
        const app = require('./server.js');
        console.log('Backend loaded successfully');
        process.exit(0);
    "
    
    if [ $? -eq 0 ]; then
        print_success "Backend test passed."
    else
        print_error "Backend test failed."
        exit 1
    fi
    
    cd ..
}

# Check environment variables
check_env_vars() {
    print_status "Checking environment variables..."
    
    if [ ! -f ".env.vercel.template" ]; then
        print_error "Environment template file not found."
        exit 1
    fi
    
    print_warning "Remember to set these environment variables in Vercel dashboard:"
    echo ""
    cat .env.vercel.template | grep -E "^[A-Z_]+=.*" | sed 's/=.*/=...' | head -10
    echo ""
    print_warning "Full list available in .env.vercel.template"
}

# Git operations
prepare_git() {
    print_status "Preparing git repository..."
    
    # Check if git is initialized
    if [ ! -d ".git" ]; then
        git init
        print_success "Git repository initialized."
    fi
    
    # Add all files
    git add .
    
    # Check if there are changes to commit
    if git diff --cached --quiet; then
        print_warning "No changes to commit."
    else
        git commit -m "feat: Optimize for Vercel deployment - $(date)"
        print_success "Changes committed to git."
    fi
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    # Check if Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Deploy to production
    vercel --prod
    
    if [ $? -eq 0 ]; then
        print_success "Deployment completed successfully!"
    else
        print_error "Deployment failed."
        exit 1
    fi
}

# Main execution
main() {
    echo ""
    print_status "EternalGames Jira - Vercel Deployment"
    echo "======================================"
    echo ""
    
    check_dependencies
    install_dependencies
    build_frontend
    test_backend
    check_env_vars
    prepare_git
    
    echo ""
    print_status "Ready to deploy!"
    echo ""
    read -p "Do you want to deploy to Vercel now? (y/n): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        deploy_to_vercel
        echo ""
        print_success "🎉 Deployment completed!"
        print_warning "Don't forget to:"
        echo "1. Set environment variables in Vercel dashboard"
        echo "2. Test your deployed application"
        echo "3. Check Vercel function logs if issues occur"
    else
        print_status "Deployment cancelled. You can run 'vercel --prod' manually when ready."
    fi
}

# Run main function
main "$@"
