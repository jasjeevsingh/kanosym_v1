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
            "description": "Search for test runs using any combination of filters. If no filters provided, returns recent test runs.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date_filter": {
                        "type": "string",
                        "enum": ["today", "yesterday", "this_week", "last_week", "last_month", "specific_date", "date_range", "recent"],
                        "description": "Optional: Type of date filter to apply. Defaults to 'recent' if not specified."
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
                        "description": "Filter results to a specific project by name (exact or partial match) or project ID"
                    },
                    "asset_filter": {
                        "type": "string",
                        "description": "Filter results to a specific asset (e.g., 'AAPL')"
                    },
                    "block_type_filter": {
                        "type": "string",
                        "enum": ["classical", "hybrid", "quantum"],
                        "description": "Filter results to a specific block type"
                    },
                    "test_run_id_prefix": {
                        "type": "string",
                        "description": "Filter results by test run ID prefix (e.g., 'test-run-2025')"
                    }
                },
                "required": []
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
    },
    {
        "type": "function",
        "function": {
            "name": "update_block_position",
            "description": "Move a block to new coordinates on the canvas",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {
                        "type": "string",
                        "description": "The name of the project containing the block"
                    },
                    "block_type": {
                        "type": "string",
                        "enum": ["classical", "hybrid", "quantum"],
                        "description": "The type of block to move"
                    },
                    "new_position": {
                        "type": "object",
                        "properties": {
                            "x": {
                                "type": "number",
                                "description": "New X coordinate"
                            },
                            "y": {
                                "type": "number",
                                "description": "New Y coordinate"
                            }
                        },
                        "required": ["x", "y"],
                        "description": "New position coordinates"
                    }
                },
                "required": ["project_name", "block_type", "new_position"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_block_parameters",
            "description": "Modify block configuration parameters. Only provide the parameters you want to change - existing parameters will be preserved.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {
                        "type": "string",
                        "description": "The name of the project containing the block"
                    },
                    "block_type": {
                        "type": "string",
                        "enum": ["classical", "hybrid", "quantum"],
                        "description": "The type of block to update"
                    },
                    "parameters": {
                        "type": "object",
                        "description": "Parameters to update (partial update - only include fields to change)",
                        "properties": {
                            "portfolio": {
                                "type": "object",
                                "description": "Portfolio configuration",
                                "properties": {
                                    "assets": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "description": "Asset symbols (e.g., ['AAPL', 'GOOGL'])"
                                    },
                                    "weights": {
                                        "type": "array",
                                        "items": {"type": "number"},
                                        "description": "Asset weights (must sum to 1.0)"
                                    },
                                    "volatility": {
                                        "type": "array",
                                        "items": {"type": "number"},
                                        "description": "Asset volatilities"
                                    },
                                    "correlation_matrix": {
                                        "type": "array",
                                        "items": {
                                            "type": "array",
                                            "items": {"type": "number"}
                                        },
                                        "description": "Correlation matrix between assets"
                                    }
                                }
                            },
                            "param": {
                                "type": "string",
                                "enum": ["volatility", "weight", "correlation"],
                                "description": "Parameter to perturb"
                            },
                            "asset": {
                                "type": "string",
                                "description": "Asset to perturb (for volatility/weight)"
                            },
                            "range": {
                                "type": "array",
                                "items": {"type": "number"},
                                "minItems": 2,
                                "maxItems": 2,
                                "description": "Perturbation range [min, max]"
                            },
                            "steps": {
                                "type": "integer",
                                "description": "Number of perturbation steps"
                            }
                        }
                    }
                },
                "required": ["project_name", "block_type", "parameters"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_block",
            "description": "Place a new block on the canvas with complete portfolio configuration. ALL blocks require portfolio data with correlation matrix.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {
                        "type": "string",
                        "description": "The name of the project to add the block to"
                    },
                    "block_type": {
                        "type": "string",
                        "enum": ["classical", "hybrid", "quantum"],
                        "description": "The type of block to add"
                    },
                    "position": {
                        "type": "object",
                        "properties": {
                            "x": {
                                "type": "number",
                                "description": "X coordinate for the block"
                            },
                            "y": {
                                "type": "number",
                                "description": "Y coordinate for the block"
                            }
                        },
                        "required": ["x", "y"],
                        "description": "Position to place the block"
                    },
                    "parameters": {
                        "type": "object",
                        "description": "REQUIRED: Complete block parameters including portfolio configuration",
                        "properties": {
                            "portfolio": {
                                "type": "object",
                                "description": "REQUIRED: Portfolio configuration with assets, weights, volatility, and correlation matrix",
                                "properties": {
                                    "assets": {
                                        "type": "array",
                                        "items": {"type": "string"},
                                        "description": "Asset symbols (e.g., ['AAPL', 'GOOGL'])"
                                    },
                                    "weights": {
                                        "type": "array",
                                        "items": {"type": "number"},
                                        "description": "Asset weights (must sum to 1.0)"
                                    },
                                    "volatility": {
                                        "type": "array",
                                        "items": {"type": "number"},
                                        "description": "Asset volatilities (positive numbers)"
                                    },
                                    "correlation_matrix": {
                                        "type": "array",
                                        "items": {
                                            "type": "array",
                                            "items": {"type": "number"}
                                        },
                                        "description": "NxN correlation matrix (symmetric, diagonal=1, values in [-1,1])"
                                    }
                                },
                                "required": ["assets", "weights", "volatility", "correlation_matrix"]
                            },
                            "param": {
                                "type": "string",
                                "enum": ["volatility", "weight", "correlation"],
                                "description": "REQUIRED: Parameter to perturb"
                            },
                            "asset": {
                                "type": "string",
                                "description": "Asset to perturb (required for volatility/weight)"
                            },
                            "range": {
                                "type": "array",
                                "items": {"type": "number"},
                                "minItems": 2,
                                "maxItems": 2,
                                "description": "REQUIRED: Perturbation range [min, max]"
                            },
                            "steps": {
                                "type": "integer",
                                "description": "REQUIRED: Number of perturbation steps"
                            }
                        },
                        "required": ["portfolio", "param", "range", "steps"]
                    }
                },
                "required": ["project_name", "block_type", "position", "parameters"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "remove_block",
            "description": "Remove a block from the canvas",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {
                        "type": "string",
                        "description": "The name of the project containing the block"
                    },
                    "block_type": {
                        "type": "string",
                        "enum": ["classical", "hybrid", "quantum"],
                        "description": "The type of block to remove"
                    }
                },
                "required": ["project_name", "block_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_project",
            "description": "Create a new empty project",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {
                        "type": "string",
                        "description": "Name for the new project"
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional description for the project"
                    }
                },
                "required": ["project_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_test_run",
            "description": "Remove a test run from a project (WARNING: This action cannot be undone)",
            "parameters": {
                "type": "object",
                "properties": {
                    "test_run_id": {
                        "type": "string",
                        "description": "The test run ID to delete (format: test-run-YYYYMMDD-HHMMSS)"
                    },
                    "confirm": {
                        "type": "boolean",
                        "description": "Must be true to confirm deletion"
                    }
                },
                "required": ["test_run_id", "confirm"]
            }
        }
    }
]