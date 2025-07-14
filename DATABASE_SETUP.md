# KANOSYM Database Setup Guide

This guide will help you set up PostgreSQL database for KANOSYM to persist projects, project states, and test results.

## Prerequisites

1. **PostgreSQL** installed and running on your system
2. **Python 3.8+** with pip
3. **psycopg2-binary** package (already added to requirements.txt)

## Step 1: Install PostgreSQL

### macOS (using Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Windows
Download and install from: https://www.postgresql.org/download/windows/

## Step 2: Create Database

1. **Connect to PostgreSQL**:
   ```bash
   # macOS/Linux
   sudo -u postgres psql
   
   # Or if you have a user setup
   psql -U postgres
   ```

2. **Create the database**:
   ```sql
   CREATE DATABASE kanosym;
   ```

3. **Create a user** (optional, you can use the default postgres user):
   ```sql
   CREATE USER kanosym_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE kanosym TO kanosym_user;
   ```

4. **Exit PostgreSQL**:
   ```sql
   \q
   ```

## Step 3: Configure Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kanosym
DB_USER=postgres
DB_PASSWORD=your_password_here

# OpenAI API Key (for Noira chat)
OPENAI_API_KEY=your_openai_api_key_here
```

**Note**: Replace `your_password_here` with your actual PostgreSQL password.

## Step 4: Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

## Step 5: Initialize Database

Run the database setup script:

```bash
cd backend
python setup_database.py
```

This script will:
1. Create all necessary tables
2. Set up indexes for performance
3. Optionally migrate existing projects from files
4. Create a sample project for testing

## Step 6: Verify Setup

1. **Start the backend server**:
   ```bash
   cd backend
   python api.py
   ```

2. **Test the API**:
   ```bash
   curl http://localhost:5001/api/projects
   ```

You should see a JSON response with an empty projects array or existing projects.

## Database Schema

The database includes the following tables:

### `projects`
- Stores project metadata (name, description, timestamps)

### `project_states`
- Stores UI state, block configurations, and positions
- Versioned with timestamps
- Only one "current" state per project

### `test_runs`
- Stores test run metadata (type, parameters, execution time)

### `test_results`
- Stores individual test results for each step

### `analytics_metrics`
- Stores performance and statistical metrics

## Migration from File-Based Storage

If you have existing projects in `.ksm` files, the setup script will automatically migrate them to the database. The migration process:

1. Reads existing `.ksm` files
2. Creates database records for projects
3. Migrates project states
4. Migrates test runs and results
5. Preserves all data and relationships

## Troubleshooting

### Connection Issues
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check connection string in `.env` file
- Ensure database exists: `psql -U postgres -d kanosym`

### Permission Issues
- Make sure your database user has proper permissions
- Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`

### Migration Issues
- Backup existing `.ksm` files before migration
- Check the setup script logs for specific errors
- Verify file permissions on the backend directory

## Backup and Recovery

### Backup Database
```bash
pg_dump -U postgres kanosym > kanosym_backup.sql
```

### Restore Database
```bash
psql -U postgres kanosym < kanosym_backup.sql
```

## Performance Considerations

- The database includes indexes for common queries
- Large test result sets are stored efficiently
- Consider regular database maintenance for optimal performance

## Security Notes

- Never commit the `.env` file to version control
- Use strong passwords for database users
- Consider using connection pooling for production deployments
- Regularly update PostgreSQL and dependencies

## Next Steps

After successful database setup:

1. Start the backend server: `python api.py`
2. Start the frontend: `npm run dev`
3. Create a new project to test the database integration
4. Run sensitivity tests to verify data persistence

The application will now automatically save all projects, states, and test results to the database, ensuring data persistence across application restarts. 