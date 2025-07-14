"""
database.py

PostgreSQL database module for KANOSYM.
Handles database connections, schema creation, and CRUD operations for projects, states, and test results.
"""

import psycopg2
import psycopg2.extras
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import uuid
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Manages PostgreSQL database operations for KANOSYM"""
    
    def __init__(self, connection_string: str = None):
        """
        Initialize database manager.
        
        Args:
            connection_string: PostgreSQL connection string. If None, uses environment variables.
        """
        self.connection_string = connection_string or self._get_connection_string()
        self._create_tables()
    
    def _get_connection_string(self) -> str:
        """Get database connection string from environment variables"""
        import os
        from dotenv import load_dotenv
        load_dotenv()
        
        host = os.getenv('DB_HOST', 'localhost')
        port = os.getenv('DB_PORT', '5432')
        database = os.getenv('DB_NAME', 'kanosym')
        user = os.getenv('DB_USER', 'postgres')
        password = os.getenv('DB_PASSWORD', '')
        
        return f"postgresql://{user}:{password}@{host}:{port}/{database}"
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = None
        try:
            conn = psycopg2.connect(self.connection_string)
            yield conn
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()
    
    def _create_tables(self):
        """Create database tables if they don't exist"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # Projects table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS projects (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        name VARCHAR(255) NOT NULL UNIQUE,
                        description TEXT,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # Project states table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS project_states (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                        state_data JSONB NOT NULL,
                        version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
                        created_at TIMESTAMP DEFAULT NOW(),
                        is_current BOOLEAN DEFAULT FALSE
                    )
                """)
                
                # Test runs table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS test_runs (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
                        test_type VARCHAR(50) NOT NULL,
                        parameter_type VARCHAR(50) NOT NULL,
                        asset_name VARCHAR(255) NOT NULL,
                        range_min DECIMAL(10,6) NOT NULL,
                        range_max DECIMAL(10,6) NOT NULL,
                        steps INTEGER NOT NULL,
                        baseline_volatility_daily DECIMAL(10,6),
                        baseline_volatility_annualized DECIMAL(10,6),
                        created_at TIMESTAMP DEFAULT NOW(),
                        execution_time_seconds DECIMAL(10,3),
                        status VARCHAR(50) DEFAULT 'completed'
                    )
                """)
                
                # Test results table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS test_results (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        test_run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
                        perturbed_value DECIMAL(10,6) NOT NULL,
                        portfolio_volatility_daily DECIMAL(10,6),
                        portfolio_volatility_annualized DECIMAL(10,6),
                        delta_vs_baseline DECIMAL(10,6),
                        step_order INTEGER NOT NULL,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # Analytics metrics table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS analytics_metrics (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        test_run_id UUID REFERENCES test_runs(id) ON DELETE CASCADE,
                        metric_type VARCHAR(100) NOT NULL,
                        metrics JSONB NOT NULL,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                """)
                
                # Create indexes for better performance
                cur.execute("CREATE INDEX IF NOT EXISTS idx_project_states_project_id ON project_states(project_id)")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_project_states_current ON project_states(project_id, is_current)")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_test_runs_project_id ON test_runs(project_id)")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_test_results_test_run_id ON test_results(test_run_id)")
                cur.execute("CREATE INDEX IF NOT EXISTS idx_analytics_metrics_test_run_id ON analytics_metrics(test_run_id)")
                
                conn.commit()
                logger.info("Database tables created successfully")
    
    # Project operations
    def create_project(self, name: str, description: str = None) -> str:
        """Create a new project and return its ID"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO projects (name, description)
                    VALUES (%s, %s)
                    RETURNING id
                """, (name, description))
                project_id = cur.fetchone()[0]
                conn.commit()
                logger.info(f"Created project: {name} with ID: {project_id}")
                return str(project_id)
    
    def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get project by ID"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM projects WHERE id = %s
                """, (project_id,))
                result = cur.fetchone()
                return dict(result) if result else None
    
    def get_project_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get project by name"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM projects WHERE name = %s
                """, (name,))
                result = cur.fetchone()
                return dict(result) if result else None
    
    def list_projects(self) -> List[Dict[str, Any]]:
        """List all projects"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM projects ORDER BY updated_at DESC
                """)
                results = cur.fetchall()
                return [dict(row) for row in results]
    
    def update_project(self, project_id: str, name: str = None, description: str = None) -> bool:
        """Update project details"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                updates = []
                params = []
                
                if name is not None:
                    updates.append("name = %s")
                    params.append(name)
                if description is not None:
                    updates.append("description = %s")
                    params.append(description)
                
                if not updates:
                    return False
                
                updates.append("updated_at = NOW()")
                params.append(project_id)
                
                cur.execute(f"""
                    UPDATE projects SET {', '.join(updates)}
                    WHERE id = %s
                """, params)
                conn.commit()
                return cur.rowcount > 0
    
    def delete_project(self, project_id: str) -> bool:
        """Delete project and all related data"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM projects WHERE id = %s", (project_id,))
                conn.commit()
                return cur.rowcount > 0
    
    def rename_project(self, project_id: str, new_name: str) -> bool:
        """Rename a project"""
        return self.update_project(project_id, name=new_name)
    
    # Project state operations
    def save_project_state(self, project_id: str, state_data: Dict[str, Any], version: str = "1.0.0") -> str:
        """Save project state and return state ID"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                # Set all existing states for this project to not current
                cur.execute("""
                    UPDATE project_states SET is_current = FALSE
                    WHERE project_id = %s
                """, (project_id,))
                
                # Insert new state as current
                cur.execute("""
                    INSERT INTO project_states (project_id, state_data, version, is_current)
                    VALUES (%s, %s, %s, TRUE)
                    RETURNING id
                """, (project_id, json.dumps(state_data), version))
                
                state_id = cur.fetchone()[0]
                conn.commit()
                logger.info(f"Saved project state for project {project_id}")
                return str(state_id)
    
    def get_project_state(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get current project state"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM project_states 
                    WHERE project_id = %s AND is_current = TRUE
                    ORDER BY created_at DESC LIMIT 1
                """, (project_id,))
                result = cur.fetchone()
                if result:
                    state_dict = dict(result)
                    # Handle both JSON string and dict cases
                    if isinstance(state_dict['state_data'], str):
                        state_dict['state_data'] = json.loads(state_dict['state_data'])
                    return state_dict
                return None
    
    def get_project_state_history(self, project_id: str) -> List[Dict[str, Any]]:
        """Get all project states for a project"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute("""
                    SELECT * FROM project_states 
                    WHERE project_id = %s
                    ORDER BY created_at DESC
                """, (project_id,))
                results = cur.fetchall()
                states = []
                for row in results:
                    state_dict = dict(row)
                    # Handle both JSON string and dict cases
                    if isinstance(state_dict['state_data'], str):
                        state_dict['state_data'] = json.loads(state_dict['state_data'])
                    states.append(state_dict)
                return states
    
    # Test run operations
    def create_test_run(self, project_id: str, test_data: Dict[str, Any]) -> str:
        """Create a new test run and return its ID"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO test_runs (
                        project_id, test_type, parameter_type, asset_name,
                        range_min, range_max, steps, baseline_volatility_daily,
                        baseline_volatility_annualized, execution_time_seconds, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (
                    project_id,
                    test_data['test_type'],
                    test_data['parameter_type'],
                    test_data['asset_name'],
                    test_data['range_min'],
                    test_data['range_max'],
                    test_data['steps'],
                    test_data.get('baseline_volatility_daily'),
                    test_data.get('baseline_volatility_annualized'),
                    test_data.get('execution_time_seconds'),
                    test_data.get('status', 'completed')
                ))
                test_run_id = cur.fetchone()[0]
                conn.commit()
                logger.info(f"Created test run: {test_run_id} for project: {project_id}")
                return str(test_run_id)
    
    def save_test_results(self, test_run_id: str, results: List[Dict[str, Any]]) -> bool:
        """Save test results for a test run"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                for i, result in enumerate(results):
                    cur.execute("""
                        INSERT INTO test_results (
                            test_run_id, perturbed_value, portfolio_volatility_daily,
                            portfolio_volatility_annualized, delta_vs_baseline, step_order
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        test_run_id,
                        result['perturbed_value'],
                        result.get('portfolio_volatility_daily'),
                        result.get('portfolio_volatility_annualized'),
                        result.get('delta_vs_baseline'),
                        i
                    ))
                conn.commit()
                logger.info(f"Saved {len(results)} test results for test run: {test_run_id}")
                return True
    
    def save_analytics_metrics(self, test_run_id: str, analytics: Dict[str, Any]) -> bool:
        """Save analytics metrics for a test run"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                for metric_type, metrics in analytics.items():
                    cur.execute("""
                        INSERT INTO analytics_metrics (test_run_id, metric_type, metrics)
                        VALUES (%s, %s, %s)
                    """, (test_run_id, metric_type, json.dumps(metrics)))
                conn.commit()
                logger.info(f"Saved analytics metrics for test run: {test_run_id}")
                return True
    
    def get_test_run(self, test_run_id: str) -> Optional[Dict[str, Any]]:
        """Get test run with all related data"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                # Get test run
                cur.execute("""
                    SELECT * FROM test_runs WHERE id = %s
                """, (test_run_id,))
                test_run = cur.fetchone()
                if not test_run:
                    return None
                
                test_run_dict = dict(test_run)
                
                # Get test results
                cur.execute("""
                    SELECT * FROM test_results 
                    WHERE test_run_id = %s 
                    ORDER BY step_order
                """, (test_run_id,))
                results = cur.fetchall()
                test_run_dict['results'] = [dict(row) for row in results]
                
                # Get analytics metrics
                cur.execute("""
                    SELECT * FROM analytics_metrics 
                    WHERE test_run_id = %s
                """, (test_run_id,))
                analytics = cur.fetchall()
                analytics_dict = {}
                for row in analytics:
                    # Handle both JSON string and dict cases
                    metrics = row['metrics']
                    if isinstance(metrics, str):
                        metrics = json.loads(metrics)
                    analytics_dict[row['metric_type']] = metrics
                test_run_dict['analytics'] = analytics_dict
                
                return test_run_dict
    
    def list_test_runs(self, project_id: str = None) -> List[Dict[str, Any]]:
        """List test runs, optionally filtered by project"""
        with self.get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                if project_id:
                    cur.execute("""
                        SELECT * FROM test_runs 
                        WHERE project_id = %s 
                        ORDER BY created_at DESC
                    """, (project_id,))
                else:
                    cur.execute("""
                        SELECT * FROM test_runs 
                        ORDER BY created_at DESC
                    """)
                results = cur.fetchall()
                return [dict(row) for row in results]
    
    def delete_test_run(self, test_run_id: str) -> bool:
        """Delete test run and all related data"""
        with self.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM test_runs WHERE id = %s", (test_run_id,))
                conn.commit()
                return cur.rowcount > 0

# Global database manager instance
db_manager = None

def get_db_manager() -> DatabaseManager:
    """Get the global database manager instance"""
    global db_manager
    if db_manager is None:
        db_manager = DatabaseManager()
    return db_manager 