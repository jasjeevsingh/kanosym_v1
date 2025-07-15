"""
tools.py

Tool definitions for Noira's function calling capabilities.
Defines the tools that Noira can use to access project and test run data.
"""

# OpenAI function calling tool definitions
NOIRA_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "load_project",
            "description": "Load a project file by name to analyze its configuration, blocks, parameters, and state",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {
                        "type": "string",
                        "description": "The name of the project to load (case-insensitive)"
                    }
                },
                "required": ["project_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "load_test_run",
            "description": "Load a specific test run by its ID to analyze results, parameters, and metrics",
            "parameters": {
                "type": "object",
                "properties": {
                    "test_run_id": {
                        "type": "string",
                        "description": "The test run ID in format: test-run-YYYYMMDD-HHMMSS"
                    }
                },
                "required": ["test_run_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_test_runs",
            "description": "Search for test runs by date range or get the most recent test runs",
            "parameters": {
                "type": "object",
                "properties": {
                    "date_filter": {
                        "type": "string",
                        "enum": ["today", "yesterday", "this_week", "last_week", "last_month", "specific_date", "date_range", "recent"],
                        "description": "Type of date filter to apply"
                    },
                    "specific_date": {
                        "type": "string",
                        "description": "Specific date in YYYY-MM-DD format (only used when date_filter is 'specific_date')"
                    },
                    "start_date": {
                        "type": "string",
                        "description": "Start date in YYYY-MM-DD format (only used when date_filter is 'date_range')"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "End date in YYYY-MM-DD format (only used when date_filter is 'date_range')"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of results to return",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 50
                    },
                    "project_filter": {
                        "type": "string",
                        "description": "Optional: filter results to a specific project name"
                    },
                    "asset_filter": {
                        "type": "string",
                        "description": "Optional: filter results to a specific asset (e.g., 'AAPL')"
                    },
                    "block_type_filter": {
                        "type": "string",
                        "enum": ["classical", "hybrid", "quantum"],
                        "description": "Optional: filter results to a specific block type"
                    }
                },
                "required": ["date_filter"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_projects",
            "description": "List all available projects with their basic information",
            "parameters": {
                "type": "object",
                "properties": {
                    "sort_by": {
                        "type": "string",
                        "enum": ["name", "created", "last_modified"],
                        "description": "Field to sort projects by",
                        "default": "last_modified"
                    },
                    "ascending": {
                        "type": "boolean",
                        "description": "Sort in ascending order (False for descending)",
                        "default": False
                    }
                }
            }
        }
    }
]