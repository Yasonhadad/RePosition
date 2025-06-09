# REPOSITION - Football Analytics Platform

A cutting-edge React-based football analytics platform leveraging advanced machine learning to provide comprehensive player insights for strategic team building in FIFA Ultimate Team.

## 🚀 Features

- **Machine Learning Player Analysis**: XGBoost algorithms for position compatibility scoring
- **Advanced Search & Filtering**: Find players by position, club, league, and performance metrics
- **Player Favorites System**: Save and manage your preferred players
- **Comprehensive Player Profiles**: Detailed statistics and position compatibility analysis
- **Professional Dashboard**: Real-time statistics and analytics overview
- **Responsive Design**: Modern UI optimized for all devices
- **Secure Authentication**: User registration and login system

## 🛠 Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Wouter Router
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Machine Learning**: XGBoost position compatibility engine
- **UI Components**: Shadcn/ui, Radix UI, Lucide React Icons
- **State Management**: TanStack Query (React Query)
- **Authentication**: Passport.js with session management

## 📋 Prerequisites

Before running this project, ensure you have the following installed:

- **Node.js** (version 18.0 or higher)
- **npm** (comes with Node.js)
- **PostgreSQL** (version 12.0 or higher)
- **Git** (for cloning the repository)

## 🔧 Installation & Setup

### 1. Download the Project

Download the project from Replit or clone from your repository:

```bash
# If cloning from Git
git clone <your-repository-url>
cd reposition-football-analytics

# If downloaded as ZIP, extract and navigate to the folder
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Create a PostgreSQL database for the project:

```sql
-- Connect to PostgreSQL as a superuser
CREATE DATABASE reposition_db;
CREATE USER reposition_user WITH PASSWORD 'your_password_here';
GRANT ALL PRIVILEGES ON DATABASE reposition_db TO reposition_user;
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Database Configuration
DATABASE_URL=postgresql://reposition_user:your_password_here@localhost:5432/reposition_db
PGHOST=localhost
PGPORT=5432
PGDATABASE=reposition_db
PGUSER=reposition_user
PGPASSWORD=your_password_here

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-here-make-it-long-and-random

# Environment
NODE_ENV=development
```

**Important**: Replace `your_password_here` and `your-super-secret-session-key-here-make-it-long-and-random` with your actual values.

### 5. Database Schema Setup

Initialize the database tables:

```bash
npm run db:push
```

### 6. Data Import (Optional)

If you have player data CSV files, you can import them using the provided scripts:

```bash
# Import competitions and clubs data
node load_competitions_clubs.py

# Import player data
node load_all_players.py

# Apply ML position compatibility scores
node batch_update_advanced_ml.py
```

## 🚀 Running the Application

### Development Mode

Start the development server:

```bash
npm run dev
```

The application will be available at:
- **Frontend & Backend**: http://localhost:5000

### Production Mode

For production deployment:

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
reposition-football-analytics/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utility functions
├── server/                # Backend Express application
│   ├── auth.ts           # Authentication logic
│   ├── routes.ts         # API routes
│   ├── storage.ts        # Database operations
│   └── db.ts             # Database connection
├── shared/               # Shared types and schemas
├── models/              # ML model files
├── scripts/             # Data processing scripts
└── uploads/             # File upload directory
```

## 🔑 Key Features Explained

### Machine Learning Engine

The platform uses advanced XGBoost models to analyze player compatibility across different positions:

- **Position Fitness Scoring**: Each player receives compatibility scores for all positions
- **Real-time Analysis**: Instant position recommendations based on player attributes
- **Data-driven Insights**: Evidence-based recommendations for team building

### Player Search & Analysis

- **Advanced Filtering**: Search by position, club, league, age, and performance metrics
- **Detailed Profiles**: Comprehensive player statistics and compatibility analysis
- **Favorites System**: Save and organize preferred players for easy access

### Dashboard Analytics

- **Real-time Statistics**: Live data on total players, teams, and competitions
- **Performance Metrics**: Overview of platform usage and data insights
- **Clean Interface**: Professional design optimized for decision-making

## 🔒 Authentication

The platform includes a complete authentication system:

- **User Registration**: Create accounts with email and password
- **Secure Login**: Session-based authentication with PostgreSQL storage
- **Protected Routes**: Secure access to favorites and user-specific features

## 🎨 UI/UX Design

- **Modern Interface**: Clean, professional design with REPOSITION branding
- **Responsive Layout**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Themes**: Automatic theme detection and switching
- **Accessibility**: WCAG compliant with proper contrast and navigation

## 📊 Database Schema

The application uses the following main tables:

- **users**: User accounts and authentication data
- **players**: Comprehensive player information and statistics
- **clubs**: Football club data
- **competitions**: League and tournament information
- **player_favorites**: User favorite player relationships
- **sessions**: Secure session storage

## 🛠 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Database operations
npm run db:push          # Push schema changes
npm run db:studio       # Open Drizzle Studio (if available)

# Type checking
npm run type-check

# Linting (if configured)
npm run lint
```

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Ensure database and user exist

2. **Port Already in Use**
   - Change port in server configuration
   - Kill process using port 5000: `lsof -ti:5000 | xargs kill -9`

3. **Missing Dependencies**
   - Run `npm install` to ensure all packages are installed
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`

4. **Environment Variables**
   - Ensure .env file exists in root directory
   - Verify all required variables are set
   - Restart server after changing .env

### Performance Optimization

- Ensure PostgreSQL is properly indexed
- Use connection pooling for database connections
- Enable gzip compression for production
- Implement proper caching strategies

## 📈 Scaling Considerations

For production deployment:

1. **Database**: Use managed PostgreSQL service (AWS RDS, Google Cloud SQL)
2. **Hosting**: Deploy to cloud platforms (Vercel, Netlify, AWS, Google Cloud)
3. **CDN**: Implement content delivery network for static assets
4. **Monitoring**: Add application performance monitoring (APM)
5. **Security**: Implement rate limiting, HTTPS, and security headers

## 🤝 Contributing

When contributing to this project:

1. Follow TypeScript best practices
2. Maintain consistent code formatting
3. Write comprehensive tests for new features
4. Update documentation for any API changes
5. Ensure database migrations are reversible

## 📝 License

This project is proprietary software developed for football analytics purposes.

## 📞 Support

For technical support or questions:

- Check the troubleshooting section above
- Review the project documentation
- Ensure all dependencies are properly installed
- Verify environment configuration

---

**Machine-Learning Engine that scores every player's ideal position and helps you build data-driven, high-performance squads.**

Happy analyzing! ⚽🚀