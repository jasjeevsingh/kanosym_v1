# KANOSYM File Implementation Summary

## Overview

This document outlines the implementation of `.ksm` project files and test run output files for the KANOSYM application. The system provides persistent storage for project state and test results, allowing users to save and load their work across application sessions.

## File Structure

### Directory Layout
```
kanosym_v1/
├── projects/                    # .ksm project files
│   ├── Project Alpha.ksm
│   ├── Project Beta.ksm
│   └── Project Gamma.ksm
├── test-runs/                   # Test run output files
│   ├── test-run-20240115-143022.json
│   ├── test-run-20240115-144530.json
│   └── test-run-20240115-150215.json
└── backend/
    ├── file_manager.py          # File management module
    ├── test_file_manager.py     # Test script
    └── api.py                   # Updated with file endpoints
```

## 1. .ksm Project File Structure

### File Format
`.ksm` files are JSON files containing complete project state and configuration.

### Example .ksm File
```json
{
  "version": "1.0.0",
  "metadata": {
    "project_id": "proj-1752204856",
    "name": "Test Project Alpha",
    "created": "2025-07-10T23:34:16.592018",
    "last_modified": "2025-07-10T23:34:16.593894",
    "description": "Portfolio sensitivity analysis project: Test Project Alpha"
  },
  "configuration": {
    "blocks": {
      "classical": {
        "placed": true,
        "position": {"x": 200, "y": 150},
        "parameters": {
          "portfolio": {
            "assets": ["AAPL", "GOOGL", "MSFT"],
            "weights": [0.4, 0.3, 0.3],
            "volatility": [0.2, 0.25, 0.18],
            "correlation_matrix": [[1.0, 0.3, 0.2], [0.3, 1.0, 0.4], [0.2, 0.4, 1.0]]
          },
          "param": "volatility",
          "asset": "AAPL",
          "range": [0.15, 0.25],
          "steps": 5
        }
      },
      "hybrid": {
        "placed": false,
        "position": null,
        "parameters": null
      },
      "quantum": {
        "placed": false,
        "position": null,
        "parameters": null
      }
    },
    "ui_state": {
      "current_block_mode": "classical",
      "selected_block": null,
      "block_move_count": 0
    }
  },
  "results": {
    "test_runs": [
      {
        "id": "test-run-20250710-233416",
        "timestamp": "2025-07-10T23:34:16.593313",
        "block_type": "classical",
        "parameters": {},
        "results_file": "test-runs/test-run-20250710-233416.json"
      }
    ],
    "current_tab": "test-run-20250710-233416"
  }
}
```

### .ksm File Components

#### Metadata Section
- **project_id**: Unique identifier for the project
- **name**: Human-readable project name
- **created**: ISO timestamp of creation
- **last_modified**: ISO timestamp of last modification
- **description**: Project description

#### Configuration Section
- **blocks**: Configuration for each block type (classical, hybrid, quantum)
  - **placed**: Boolean indicating if block is placed
  - **position**: {x, y} coordinates if placed
  - **parameters**: Block-specific parameters (portfolio, param, asset, range, steps)
- **ui_state**: Current UI state
  - **current_block_mode**: Active block mode
  - **selected_block**: Currently selected block
  - **block_move_count**: Number of times blocks have been moved

#### Results Section
- **test_runs**: Array of test run references
  - **id**: Test run identifier
  - **timestamp**: When test run was created
  - **block_type**: Type of block used
  - **parameters**: Test parameters
  - **results_file**: Path to test run file
- **current_tab**: Currently active test run tab

## 2. Test Run Output File Structure

### File Format
Test run files are JSON files containing complete test results, analytics, and metadata.

### Example Test Run File
```json
{
  "test_run_id": "test-run-20250710-233416",
  "timestamp": "2025-07-10T23:34:16.594111",
  "project_id": "proj-1752204856",
  "block_type": "classical",
  "parameters": {
    "portfolio": {
      "assets": ["AAPL", "GOOGL", "MSFT"],
      "weights": [0.4, 0.3, 0.3],
      "volatility": [0.2, 0.25, 0.18],
      "correlation_matrix": [[1.0, 0.3, 0.2], [0.3, 1.0, 0.4], [0.2, 0.4, 1.0]]
    },
    "param": "volatility",
    "asset": "AAPL",
    "range": [0.15, 0.25],
    "steps": 5
  },
  "results": {
    "perturbation": "volatility",
    "asset": "AAPL",
    "range_tested": [0.15, 0.18, 0.21, 0.24, 0.25],
    "baseline_portfolio_volatility_daily": 0.0215,
    "baseline_portfolio_volatility_annualized": 0.0542,
    "results": [
      {
        "perturbed_value": 0.15,
        "portfolio_volatility_daily": 0.0198,
        "portfolio_volatility_annualized": 0.0499,
        "delta_vs_baseline": -0.0017
      }
    ]
  },
  "analytics": {
    "mode": "classical",
    "performance_metrics": {
      "total_execution_time": 0.234,
      "throughput": 21.4,
      "steps_processed": 5,
      "memory_usage_mb": 45.2,
      "cpu_usage_percent": 12.5
    },
    "statistical_metrics": {
      "confidence_interval_95": [0.0198, 0.0251],
      "coefficient_of_variation": 0.0892,
      "skewness": 0.2341,
      "kurtosis": -0.5678,
      "standard_error": 0.0456,
      "statistical_significance": 0.9876
    },
    "classical_metrics": {
      "simulations_per_second": 1250,
      "iterations_per_second": 850,
      "convergence_rate": 0.95,
      "monte_carlo_efficiency": 0.87
    },
    "sensitivity_metrics": {
      "max_sensitivity_point": 0.22,
      "curve_steepness": 0.045,
      "risk_return_ratio": 1.23,
      "portfolio_beta": 0.89,
      "var_95": 0.0234,
      "expected_shortfall": 0.0312
    }
  },
  "noira_analysis": {
    "analysis_id": "analysis-20240115-143022",
    "messages": [
      {
        "role": "assistant",
        "content": "Analysis complete for AAPL volatility sensitivity...",
        "timestamp": "2024-01-15T14:30:25Z"
      }
    ]
  }
}
```

### Test Run File Components

#### Metadata
- **test_run_id**: Unique identifier for the test run
- **timestamp**: ISO timestamp of test run creation
- **project_id**: ID of the project this test run belongs to
- **block_type**: Type of block used (classical, hybrid, quantum)

#### Parameters
- **portfolio**: Portfolio configuration (assets, weights, volatility, correlation_matrix)
- **param**: Parameter being tested (volatility, weight, correlation)
- **asset**: Asset being perturbed
- **range**: [min, max] range for perturbation
- **steps**: Number of steps in the range

#### Results
- **perturbation**: Parameter being perturbed
- **asset**: Asset being tested
- **range_tested**: Array of actual values tested
- **baseline_portfolio_volatility_daily**: Baseline daily volatility
- **baseline_portfolio_volatility_annualized**: Baseline annualized volatility
- **results**: Array of individual test results with deltas

#### Analytics
- **performance_metrics**: Execution time, throughput, resource usage
- **statistical_metrics**: Confidence intervals, statistical measures
- **mode_specific_metrics**: Block-type specific metrics (classical, quantum, hybrid)
- **sensitivity_metrics**: Finance-specific sensitivity measures

#### Noira Analysis
- **analysis_id**: Unique analysis identifier
- **messages**: Array of Noira analysis messages

## 3. Backend Implementation

### File Manager Module (`backend/file_manager.py`)

The `FileManager` class provides comprehensive file operations:

#### Project Operations
- `create_project(name, project_id)`: Create new .ksm file
- `load_project(name)`: Load project configuration
- `save_project(name, project_config)`: Save project configuration
- `delete_project(name)`: Delete project file
- `list_projects()`: List all available projects

#### Test Run Operations
- `save_test_run(project_id, test_run_data)`: Save test run file
- `load_test_run(test_run_id)`: Load test run data
- `delete_test_run(test_run_id)`: Delete test run file
- `list_test_runs(project_id)`: List test runs (optionally filtered)

#### State Management
- `get_project_state(project_name)`: Get complete project state
- `save_project_state(project_name, project_state)`: Save complete state
- `update_project_test_runs(project_name, test_run_id)`: Update project with new test run

### API Endpoints

#### Project Endpoints
- `GET /api/projects`: List all projects
- `POST /api/projects`: Create new project
- `GET /api/projects/<project_name>`: Get specific project
- `PUT /api/projects/<project_name>`: Update project
- `DELETE /api/projects/<project_name>`: Delete project
- `GET /api/projects/<project_name>/state`: Get complete project state
- `PUT /api/projects/<project_name>/state`: Save complete project state

#### Test Run Endpoints
- `GET /api/test-runs`: List test runs (optionally filtered by project)
- `GET /api/test-runs/<test_run_id>`: Get specific test run
- `POST /api/test-runs`: Create new test run
- `DELETE /api/test-runs/<test_run_id>`: Delete test run

## 4. Usage Examples

### Creating a New Project
```bash
curl -X POST http://localhost:5001/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My Portfolio Analysis"}'
```

### Loading a Project
```bash
curl http://localhost:5001/api/projects/My%20Portfolio%20Analysis
```

### Saving Test Run Results
```bash
curl -X POST http://localhost:5001/api/test-runs \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj-1234567890",
    "test_run_data": {
      "block_type": "classical",
      "parameters": {...},
      "results": {...},
      "analytics": {...}
    }
  }'
```

### Getting Complete Project State
```bash
curl http://localhost:5001/api/projects/My%20Portfolio%20Analysis/state
```

## 5. Integration with Frontend

### State Persistence
The frontend can now:
1. **Save project state** when blocks are placed, moved, or configured
2. **Load project state** when opening a project
3. **Save test results** after each test run
4. **Load test results** when switching between tabs

### File Operations
- **Create projects** from the UI
- **Load existing projects** from the file explorer
- **Save project state** automatically or on demand
- **Export/import** projects via .ksm files

### Test Run Management
- **Save test results** with full analytics
- **Load test results** for display in charts
- **Manage test run history** per project
- **Delete old test runs** to save space

## 6. Benefits

### Persistence
- **Project state persists** across application sessions
- **Test results are saved** for later analysis
- **Configuration is preserved** when switching projects

### Organization
- **Projects are organized** in a clear file structure
- **Test runs are linked** to their parent projects
- **Metadata is tracked** for easy searching and filtering

### Scalability
- **File-based storage** allows for large numbers of projects
- **Separate test run files** prevent .ksm files from becoming too large
- **JSON format** enables easy parsing and manipulation

### Interoperability
- **Standard JSON format** allows external tools to read/write files
- **Clear file structure** makes it easy to understand and modify
- **Versioned format** allows for future schema evolution

## 7. Testing

Run the test script to validate the implementation:
```bash
cd backend
python test_file_manager.py
```

This will create sample projects and test runs, demonstrating all file operations.

## 8. Future Enhancements

### Potential Improvements
1. **File compression** for large test run files
2. **Incremental saving** to reduce I/O overhead
3. **File versioning** for backup and rollback
4. **Export formats** (CSV, Excel) for test results
5. **Project templates** for common configurations
6. **Cloud storage integration** for remote project access

### Schema Evolution
- **Version field** in .ksm files allows for schema updates
- **Backward compatibility** can be maintained
- **Migration tools** can update old file formats

This implementation provides a solid foundation for persistent project and test run storage in the KANOSYM application. 