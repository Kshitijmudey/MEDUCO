#!/bin/bash

# MEDUCO Healthcare Platform - PostgreSQL Setup Script

echo "🐘 MEDUCO PostgreSQL Setup Guide"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if PostgreSQL is installed
check_postgresql() {
    if command -v psql &> /dev/null; then
        print_status "PostgreSQL is installed"
        psql --version
        return 0
    else
        print_error "PostgreSQL is not installed"
        return 1
    fi
}

# Install PostgreSQL based on OS
install_postgresql() {
    print_info "Installing PostgreSQL..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "Installing PostgreSQL via Homebrew..."
            brew install postgresql
            brew services start postgresql
        else
            print_error "Homebrew not found. Please install Homebrew first or install PostgreSQL manually."
            return 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            # Ubuntu/Debian
            echo "Installing PostgreSQL via apt..."
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
        elif command -v yum &> /dev/null; then
            # RHEL/CentOS
            echo "Installing PostgreSQL via yum..."
            sudo yum install -y postgresql-server postgresql-contrib
            sudo postgresql-setup initdb
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
        else
            print_error "Unsupported Linux distribution. Please install PostgreSQL manually."
            return 1
        fi
    else
        print_error "Unsupported operating system. Please install PostgreSQL manually."
        return 1
    fi

    print_status "PostgreSQL installation completed"
}

# Create database and user
setup_database() {
    print_info "Setting up MEDUCO database..."

    # Create database
    echo "Creating database 'meduco'..."
    if createdb meduco 2>/dev/null; then
        print_status "Database 'meduco' created successfully"
    else
        print_warning "Database 'meduco' might already exist or there was an error"
    fi

    # Test connection
    if psql -d meduco -c "SELECT version();" &>/dev/null; then
        print_status "Database connection test successful"
        return 0
    else
        print_error "Failed to connect to database"
        return 1
    fi
}

# Setup environment file
setup_environment() {
    print_info "Setting up environment configuration..."

    cd backend || { print_error "Backend directory not found"; return 1; }

    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_status "Environment file created from template"
        else
            print_error ".env.example not found"
            return 1
        fi
    else
        print_warning "Environment file already exists"
    fi

    # Update DATABASE_TYPE to postgresql
    if command -v sed &> /dev/null; then
        sed -i.bak 's/DATABASE_TYPE=sqlite/DATABASE_TYPE=postgresql/' .env
        print_status "Updated DATABASE_TYPE to postgresql"
    else
        print_warning "Please manually update DATABASE_TYPE=postgresql in .env file"
    fi

    print_info "Please update the following values in backend/.env:"
    echo "  - POSTGRES_PASSWORD (your PostgreSQL password)"
    echo "  - JWT_SECRET (a secure random string)"
    echo "  - OPENAI_API_KEY (optional, for AI features)"
    echo "  - TWILIO credentials (optional, for SMS)"
    echo "  - SMTP credentials (optional, for email)"

    cd ..
}

# Install Node.js dependencies
install_dependencies() {
    print_info "Installing Node.js dependencies..."

    cd backend || { print_error "Backend directory not found"; return 1; }

    if [ ! -d node_modules ]; then
        npm install
        print_status "Dependencies installed successfully"
    else
        print_status "Dependencies already installed"
    fi

    cd ..
}

# Setup database schema
setup_schema() {
    print_info "Setting up database schema..."

    cd backend || { print_error "Backend directory not found"; return 1; }

    if npm run setup-db-postgres; then
        print_status "Database schema created successfully"
    else
        print_error "Failed to create database schema"
        return 1
    fi

    cd ..
}

# Initialize database with empty tables
init_database() {
    print_info "Initializing database with empty tables..."

    cd backend || { print_error "Backend directory not found"; return 1; }

    if npm run init-db-postgres; then
        print_status "Database initialized successfully"
    else
        print_error "Failed to initialize database"
        return 1
    fi

    cd ..
}

# Migrate from SQLite (if exists)
migrate_from_sqlite() {
    if [ -f "backend/database/meduco.db" ]; then
        echo ""
        read -p "SQLite database found. Do you want to migrate data to PostgreSQL? (y/N): " migrate_choice
        if [[ $migrate_choice =~ ^[Yy]$ ]]; then
            print_info "Migrating data from SQLite to PostgreSQL..."

            cd backend || { print_error "Backend directory not found"; return 1; }

            if npm run migrate-to-postgres; then
                print_status "Data migration completed successfully"
            else
                print_error "Data migration failed"
                return 1
            fi

            cd ..
        fi
    fi
}

# Test the setup
test_setup() {
    print_info "Testing the setup..."

    cd backend || { print_error "Backend directory not found"; return 1; }

    # Test database connection
    if node -e "
        const db = require('./config/database-postgres');
        db.connect().then(() => {
            console.log('✅ Database connection successful');
            return db.healthCheck();
        }).then(health => {
            console.log('✅ Database health check passed');
            process.exit(0);
        }).catch(err => {
            console.error('❌ Database test failed:', err.message);
            process.exit(1);
        });
    "; then
        print_status "Database tests passed"
    else
        print_error "Database tests failed"
        return 1
    fi

    cd ..
}

# Main execution
main() {
    echo ""
    print_info "Starting PostgreSQL setup for MEDUCO Healthcare Platform..."
    echo ""

    # Step 1: Check/Install PostgreSQL
    if ! check_postgresql; then
        read -p "Do you want to install PostgreSQL? (y/N): " install_choice
        if [[ $install_choice =~ ^[Yy]$ ]]; then
            if ! install_postgresql; then
                print_error "PostgreSQL installation failed"
                exit 1
            fi
        else
            print_error "PostgreSQL is required. Please install it manually."
            exit 1
        fi
    fi

    echo ""

    # Step 2: Setup database
    if ! setup_database; then
        print_error "Database setup failed"
        exit 1
    fi

    echo ""

    # Step 3: Setup environment
    setup_environment

    echo ""

    # Step 4: Install dependencies
    if ! install_dependencies; then
        print_error "Dependency installation failed"
        exit 1
    fi

    echo ""

    # Step 5: Setup schema
    if ! setup_schema; then
        print_error "Schema setup failed"
        exit 1
    fi

    echo ""

    # Step 6: Initialize database
    if ! init_database; then
        print_error "Database initialization failed"
        exit 1
    fi

    echo ""

    # Step 7: Optional migration
    migrate_from_sqlite

    echo ""

    # Step 8: Test setup
    if ! test_setup; then
        print_error "Setup tests failed"
        exit 1
    fi

    echo ""
    echo "🎉 PostgreSQL setup completed successfully!"
    echo ""
    echo "📋 Next Steps:"
    echo "============="
    echo "1. Review and update backend/.env with your specific configuration"
    echo "2. Start the development server:"
    echo "   cd backend && npm run dev"
    echo ""
    echo "3. Start the frontend server:"
    echo "   cd frontend/static-site && python3 -m http.server 8080"
    echo ""
    echo "4. Register new users through the frontend - no sample data included"
    echo ""
    echo "🔐 Database Status:"
    echo "==================="
    echo "✅ All tables are empty and ready for real-time data"
    echo "✅ No sample data - production ready"
    echo "✅ User registration available through frontend"
    echo ""
    echo "🌐 Access Points:"
    echo "=================="
    echo "Frontend: http://localhost:8080"
    echo "Backend API: http://localhost:3001"
    echo "API Docs: http://localhost:3001/api/v1/docs"
    echo "Health Check: http://localhost:3001/health"
    echo ""
    echo "📚 Documentation:"
    echo "=================="
    echo "- README.md - Complete setup and usage guide"
    echo "- API Documentation available at /api/v1/docs endpoint"
    echo "- Environment template at backend/.env.example"
    echo ""
}

# Run main function
main "$@"
