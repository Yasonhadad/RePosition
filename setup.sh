#!/bin/bash

# REPOSITION Football Analytics - Automatic Setup Script
# This script automatically sets up the development environment

set -e

echo "🚀 Setting up REPOSITION Football Analytics Platform..."

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

# Check if Node.js is installed
check_nodejs() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
        
        # Check if version is 18 or higher
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_error "Node.js version 18 or higher is required. Current: $NODE_VERSION"
            echo "Please upgrade Node.js from https://nodejs.org"
            exit 1
        fi
    else
        print_error "Node.js is not installed"
        echo "Please install Node.js 18+ from https://nodejs.org"
        exit 1
    fi
}

# Check if PostgreSQL is installed
check_postgresql() {
    if command -v psql &> /dev/null; then
        PG_VERSION=$(psql --version)
        print_success "PostgreSQL is installed: $PG_VERSION"
    else
        print_error "PostgreSQL is not installed"
        echo "Please install PostgreSQL from https://www.postgresql.org/download/"
        exit 1
    fi
}

# Install npm dependencies
install_dependencies() {
    print_status "Installing npm dependencies..."
    npm install
    print_success "Dependencies installed successfully"
}

# Setup environment file
setup_environment() {
    if [ ! -f .env ]; then
        print_status "Setting up environment configuration..."
        cp .env.example .env
        
        # Generate a random session secret
        SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || echo "change-this-to-a-very-long-random-string-$(date +%s)")
        
        # Update the .env file with generated secret
        if command -v sed &> /dev/null; then
            sed -i.bak "s/change-this-to-a-very-long-random-string-for-security/$SESSION_SECRET/" .env
            rm .env.bak 2>/dev/null || true
        fi
        
        print_warning "Please edit .env file with your PostgreSQL credentials"
        print_warning "Update DATABASE_URL, PGUSER, and PGPASSWORD with your settings"
        
        if command -v code &> /dev/null; then
            echo "Opening .env file in VS Code..."
            code .env
        elif command -v nano &> /dev/null; then
            echo "You can edit the .env file with: nano .env"
        else
            echo "Please edit the .env file with your preferred text editor"
        fi
    else
        print_success "Environment file already exists"
    fi
}

# Create database
setup_database() {
    print_status "Attempting to create database..."
    
    # Check if we can connect to PostgreSQL
    if command -v createdb &> /dev/null; then
        # Try to create database (will fail if already exists, which is OK)
        createdb reposition_db 2>/dev/null || print_warning "Database might already exist"
        
        # Try to create user (will fail if already exists, which is OK)
        psql -d postgres -c "CREATE USER reposition_user WITH PASSWORD 'yourpassword123';" 2>/dev/null || print_warning "User might already exist"
        psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE reposition_db TO reposition_user;" 2>/dev/null || true
        
        print_success "Database setup completed"
    else
        print_warning "Could not automatically create database"
        print_warning "Please create the database manually:"
        echo "  createdb reposition_db"
        echo "  psql -d postgres -c \"CREATE USER reposition_user WITH PASSWORD 'yourpassword123';\""
        echo "  psql -d postgres -c \"GRANT ALL PRIVILEGES ON DATABASE reposition_db TO reposition_user;\""
    fi
}

# Initialize database schema
init_database_schema() {
    print_status "Initializing database schema..."
    
    # Source environment variables
    if [ -f .env ]; then
        export $(cat .env | grep -v '^#' | xargs)
    fi
    
    npm run db:push
    print_success "Database schema initialized"
}

# Main setup function
main() {
    echo ""
    echo "=============================================="
    echo "  REPOSITION Football Analytics Setup"
    echo "=============================================="
    echo ""
    
    # Check prerequisites
    print_status "Checking prerequisites..."
    check_nodejs
    check_postgresql
    
    # Setup project
    install_dependencies
    setup_environment
    
    # Database setup
    read -p "Do you want to automatically setup the database? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_database
        
        read -p "Initialize database schema? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            init_database_schema
        fi
    fi
    
    echo ""
    echo "=============================================="
    print_success "Setup completed successfully!"
    echo "=============================================="
    echo ""
    echo "Next steps:"
    echo "1. Edit .env file with your database credentials (if not done already)"
    echo "2. Run: npm run dev"
    echo "3. Open: http://localhost:5000"
    echo ""
    echo "For data import, see the Python scripts in the root directory"
    echo "For detailed instructions, check README.md"
    echo ""
}

# Run main function
main "$@"