"""
chat_controller.py

Chat window controller for KANOSYM. Handles OpenAI API integration, chat history management, 
and debugging features for the Noira AI assistant.
"""

import json
import os
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import openai
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ChatController:
    """
    Controller for managing chat interactions with OpenAI API and chat history.
    Provides debugging capabilities and chat session management.
    """
    
    def __init__(self):
        self.client: Optional[OpenAI] = None
        self.api_key: Optional[str] = None
        self.chat_history: List[Dict[str, Any]] = []
        self.debug_mode: bool = False
        self.model: str = "gpt-4o"
        self.max_tokens: int = 1000
        self.temperature: float = 0.7
        # Storage for async Noira responses
        self.pending_responses: Dict[str, Dict[str, Any]] = {}  # analysis_id -> response_data
        
        # NEW: Separate display history for what users see
        self.display_history: List[Dict[str, Any]] = []
        # Track last poll position for efficient updates
        self.display_history_positions: Dict[str, int] = {}  # client_id -> last_position
        
        # Add welcome message
        self.display_history.append({
            "role": "assistant",
            "content": """Hi! I am **Noira**, your quantum portfolio modeling assistant. How can I help you today?""",
            "timestamp": datetime.now().isoformat()
        })
    
    def set_api_key(self, api_key: str) -> Dict[str, Any]:
        """
        Set OpenAI API key and initialize client.
        
        Args:
            api_key: OpenAI API key
            
        Returns:
            Dictionary with success status and message
        """
        try:
            self.api_key = api_key
            self.client = OpenAI(api_key=api_key)
            
            # Test the API key with a simple request
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=10
            )
            
            return {
                "success": True,
                "message": "API key set successfully",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            self.client = None
            self.api_key = None
            return {
                "success": False,
                "message": f"Failed to set API key: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
    
    def get_api_status(self) -> Dict[str, Any]:
        """
        Get current API connection status.
        
        Returns:
            Dictionary with API status information
        """
        return {
            "connected": self.client is not None,
            "api_key_set": self.api_key is not None,
            "model": self.model,
            "debug_mode": self.debug_mode,
            "chat_history_length": len(self.chat_history),
            "timestamp": datetime.now().isoformat()
        }
    
    def send_message(self, message: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Send a message to the OpenAI API and get response.
        
        Args:
            message: User message to send
            context: Optional context about current portfolio/analysis state
            
        Returns:
            Dictionary with response and metadata
        """
        if not self.client:
            return {
                "success": False,
                "message": "OpenAI client not initialized. Please set API key first.",
                "timestamp": datetime.now().isoformat()
            }
        
        try:
            # Log full context and message details being sent to Noira
            logger.info("=" * 60)
            logger.info("🤖 SENDING MESSAGE TO NOIRA")
            logger.info("=" * 60)
            logger.info(f"Model: {self.model}")
            logger.info(f"Max Tokens: {self.max_tokens}")
            logger.info(f"Temperature: {self.temperature}")
            logger.info(f"Timestamp: {datetime.now().isoformat()}")
            
            if context:
                logger.info("\n📊 CONTEXT PROVIDED:")
                logger.info("-" * 40)
                logger.info(json.dumps(context, indent=2))
            else:
                logger.info("\n📊 CONTEXT: None provided")
            
            # Prepare system message with context
            system_message = self._build_system_message(context)
            
            logger.info("\n🔧 SYSTEM MESSAGE:")
            logger.info("-" * 40)
            logger.info(system_message)
            
            # Build messages array with history
            messages = [{"role": "system", "content": system_message}]
            
            # Add recent chat history (last 10 messages to stay within token limits)
            recent_history = self.chat_history[-10:] if len(self.chat_history) > 10 else self.chat_history
            messages.extend(recent_history)
            
            logger.info(f"\n💬 CHAT HISTORY: {len(recent_history)} messages included")
            if recent_history:
                logger.info("-" * 40)
                for i, hist_msg in enumerate(recent_history):
                    role = hist_msg.get('role', 'unknown')
                    content = hist_msg.get('content', '')
                    content_preview = content[:100] + "..." if len(content) > 100 else content
                    logger.info(f"  [{i+1}] {role}: {content_preview}")
            
            # Add current user message
            messages.append({"role": "user", "content": message})
            
            logger.info(f"\n📝 USER MESSAGE:")
            logger.info("-" * 40)
            logger.info(message)
            logger.info(f"\nMessage Length: {len(message)} characters")
            
            logger.info(f"\n📤 TOTAL MESSAGES TO API: {len(messages)}")
            
            # Send to OpenAI
            logger.info("\n🚀 Sending to OpenAI API...")
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature
            )
            
            assistant_response = response.choices[0].message.content
            
            logger.info("\n✅ RECEIVED RESPONSE:")
            logger.info("-" * 40)
            logger.info(assistant_response)
            logger.info(f"\nResponse Length: {len(assistant_response) if assistant_response else 0} characters")
            
            # Log token usage
            if hasattr(response, 'usage'):
                logger.info(f"\n💰 TOKEN USAGE:")
                logger.info("-" * 40)
                logger.info(f"  Prompt Tokens: {response.usage.prompt_tokens}")
                logger.info(f"  Completion Tokens: {response.usage.completion_tokens}")
                logger.info(f"  Total Tokens: {response.usage.total_tokens}")
            
            # Add to chat history
            self.chat_history.append({"role": "user", "content": message})
            self.chat_history.append({"role": "assistant", "content": assistant_response})
            
            # Note: Regular chat messages are handled directly by the frontend
            # Display history is only used for analysis operations with async responses
            
            logger.info(f"\n📚 Chat History Updated: {len(self.chat_history)} total messages")
            logger.info("=" * 60)
            
            return {
                "success": True,
                "response": assistant_response,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"\n❌ ERROR SENDING MESSAGE:")
            logger.error("-" * 40)
            logger.error(f"Error: {str(e)}")
            logger.error("=" * 60)
            
            return {
                "success": False,
                "message": f"Error sending message: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
    
    def _build_system_message(self, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Build system message with current context.
        
        Args:
            context: Optional context about current state
            
        Returns:
            System message string
        """
        base_message = """You are Noira, an AI assistant specialized in quantum portfolio analysis and the KANOSYM platform. 
        
You help users understand:
- Portfolio optimization and risk analysis
- Quantum computing applications in finance
- Sensitivity analysis and parameter perturbation
- Classical vs. hybrid vs. quantum approaches
- Interpreting analysis results and charts

IMPORTANT FORMATTING GUIDELINES:
- Use **LaTeX mathematical notation** extensively for formulas (e.g., $$\\text{Sharpe Ratio} = \\frac{E[R_p] - R_f}{\\sigma_p}$$)
- Use **markdown formatting** with headers, tables, bullet points, and emphasis
- Include mathematical equations using $$ for display math and $ for inline variables. Do not use parentheses for inline variables.
- Be quantitative and reference specific numerical results when available
- Explain complex concepts clearly with both intuitive explanations and technical mathematical details

When discussing financial metrics, always include relevant mathematical formulas using proper LaTeX notation."""
        
        if context:
            context_info = f"\n\nCurrent Context:\n{json.dumps(context, indent=2)}"
            return base_message + context_info
        
        return base_message
    
    def reset_chat(self) -> Dict[str, Any]:
        """
        Reset chat history and start fresh conversation.
        
        Returns:
            Dictionary with reset confirmation
        """
        self.chat_history.clear()
        self.display_history.clear()
        self.display_history_positions.clear()
        return {
            "success": True,
            "message": "Chat history reset successfully",
            "timestamp": datetime.now().isoformat()
        }
    
    def get_chat_history(self) -> Dict[str, Any]:
        """
        Get current chat history.
        
        Returns:
            Dictionary with chat history
        """
        return {
            "history": self.chat_history,
            "length": len(self.chat_history),
            "timestamp": datetime.now().isoformat()
        }
    
    def export_chat_history(self, filepath: str) -> Dict[str, Any]:
        """
        Export chat history to JSON file.
        
        Args:
            filepath: Path to save the chat history
            
        Returns:
            Dictionary with export status
        """
        try:
            export_data = {
                "chat_history": self.chat_history,
                "export_timestamp": datetime.now().isoformat(),
                "model": self.model,
                "settings": {
                    "max_tokens": self.max_tokens,
                    "temperature": self.temperature
                }
            }
            
            with open(filepath, 'w') as f:
                json.dump(export_data, f, indent=2)
            
            return {
                "success": True,
                "message": f"Chat history exported to {filepath}",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to export chat history: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
    
    def set_debug_mode(self, enabled: bool) -> Dict[str, Any]:
        """
        Enable or disable debug mode.
        
        Args:
            enabled: Whether to enable debug mode
            
        Returns:
            Dictionary with debug mode status
        """
        self.debug_mode = enabled
        return {
            "success": True,
            "debug_mode": self.debug_mode,
            "message": f"Debug mode {'enabled' if enabled else 'disabled'}",
            "timestamp": datetime.now().isoformat()
        }
    
    def update_settings(self, model: Optional[str] = None, 
                       max_tokens: Optional[int] = None, 
                       temperature: Optional[float] = None) -> Dict[str, Any]:
        """
        Update chat settings.
        
        Args:
            model: OpenAI model to use
            max_tokens: Maximum tokens for responses
            temperature: Temperature for response generation
            
        Returns:
            Dictionary with updated settings
        """
        if model:
            self.model = model
        if max_tokens:
            self.max_tokens = max_tokens
        if temperature is not None:
            self.temperature = temperature
        
        return {
            "success": True,
            "settings": {
                "model": self.model,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature
            },
            "timestamp": datetime.now().isoformat()
        }
    
    def get_debug_info(self) -> Dict[str, Any]:
        """
        Get debugging information.
        
        Returns:
            Dictionary with debug information
        """
        return {
            "api_key_set": self.api_key is not None,
            "api_key_preview": f"sk-...{self.api_key[-4:]}" if self.api_key else None,
            "client_initialized": self.client is not None,
            "chat_history_length": len(self.chat_history),
            "debug_mode": self.debug_mode,
            "settings": {
                "model": self.model,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature
            },
            "timestamp": datetime.now().isoformat()
        }

    def store_async_response(self, analysis_id: str, brief_message: str, llm_response: str) -> None:
        """
        Store an async Noira response for later retrieval.
        
        Args:
            analysis_id: Unique ID for the analysis
            brief_message: Brief message for frontend display
            llm_response: Full LLM response
        """
        self.pending_responses[analysis_id] = {
            "brief_message": brief_message,
            "llm_response": llm_response,
            "timestamp": datetime.now().isoformat(),
            "retrieved": False
        }
        logger.info(f"Stored async response for analysis {analysis_id}")
    
    def get_async_response(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve and mark as retrieved an async Noira response.
        
        Args:
            analysis_id: Unique ID for the analysis
            
        Returns:
            Response data if available, None otherwise
        """
        if analysis_id in self.pending_responses:
            response_data = self.pending_responses[analysis_id]
            if not response_data["retrieved"]:
                response_data["retrieved"] = True
                logger.info(f"Retrieved async response for analysis {analysis_id}")
                return response_data
        return None
    
    def get_pending_responses(self) -> List[Dict[str, Any]]:
        """
        Get all unretrieved pending responses.
        
        Returns:
            List of pending response data with analysis IDs
        """
        pending = []
        for analysis_id, response_data in self.pending_responses.items():
            if not response_data["retrieved"]:
                pending.append({
                    "analysis_id": analysis_id,
                    **response_data
                })
        return pending

    def add_brief_message(self, analysis_type: str, param: str, asset: str, analysis_id: str) -> str:
        """
        Add a brief message to display history for an analysis.
        
        Args:
            analysis_type: Type of analysis (quantum/classical/hybrid)
            param: Parameter being tested
            asset: Asset being tested
            analysis_id: Unique analysis ID for tracking
            
        Returns:
            The brief message that was added
        """
        brief_message = f"Tell me about this {analysis_type} sensitivity test for {asset} {param}."
        
        # Add to display history - just the user message, no thinking state
        self.display_history.append({
            "role": "user",
            "content": brief_message,
            "timestamp": datetime.now().isoformat(),
            "is_brief": True,
            "analysis_id": analysis_id
        })
        
        # Mark as pending for thinking indicator
        self.pending_responses[analysis_id] = {
            "brief_message": brief_message,
            "llm_response": None,  # Will be filled when response arrives
            "timestamp": datetime.now().isoformat(),
            "retrieved": False,
            "is_pending": True  # Flag to indicate this is still processing
        }
        
        logger.info(f"Added brief message to display history for {analysis_type} analysis {analysis_id}")
        return brief_message
    
    def update_display_with_response(self, analysis_id: str, llm_response: str) -> None:
        """
        Update display history by adding the actual LLM response and marking as complete.
        
        Args:
            analysis_id: Analysis ID to update
            llm_response: The actual LLM response
        """
        # Add the assistant response to display history
        self.display_history.append({
            "role": "assistant",
            "content": llm_response,
            "timestamp": datetime.now().isoformat(),
            "analysis_id": analysis_id
        })
        
        # Update pending response and mark as complete
        if analysis_id in self.pending_responses:
            self.pending_responses[analysis_id].update({
                "llm_response": llm_response,
                "is_pending": False,
                "completed_timestamp": datetime.now().isoformat()
            })
        
        logger.info(f"Added LLM response to display history for analysis {analysis_id}")
    
    def has_pending_responses(self) -> bool:
        """
        Check if there are any responses currently being processed.
        
        Returns:
            True if there are pending responses, False otherwise
        """
        return any(
            response_data.get("is_pending", False) 
            for response_data in self.pending_responses.values()
        )
    
    def get_pending_analysis_ids(self) -> List[str]:
        """
        Get list of analysis IDs that are currently pending.
        
        Returns:
            List of analysis IDs that are still processing
        """
        return [
            analysis_id 
            for analysis_id, response_data in self.pending_responses.items()
            if response_data.get("is_pending", False)
        ]
    
    def add_user_message(self, message: str) -> None:
        """
        Add a regular user message to both histories.
        
        Args:
            message: User message
        """
        msg_obj = {
            "role": "user",
            "content": message,
            "timestamp": datetime.now().isoformat()
        }
        self.display_history.append(msg_obj)
        # Regular messages also go to chat history for LLM context
        self.chat_history.append({"role": "user", "content": message})
    
    def add_assistant_message(self, message: str) -> None:
        """
        Add assistant message to both histories.
        
        Args:
            message: Assistant message
        """
        msg_obj = {
            "role": "assistant",
            "content": message,
            "timestamp": datetime.now().isoformat()
        }
        self.display_history.append(msg_obj)
        # Assistant messages also go to chat history
        self.chat_history.append({"role": "assistant", "content": message})
    
    def get_display_updates(self, client_id: str = "default", full_history: bool = False) -> Dict[str, Any]:
        """
        Get display history updates for a client.
        
        Args:
            client_id: Client identifier for tracking position
            full_history: If True, return full history regardless of position
            
        Returns:
            Dictionary with messages and metadata
        """
        last_position = self.display_history_positions.get(client_id, 0) if not full_history else 0
        current_position = len(self.display_history)
        
        # Get new messages since last position
        new_messages = self.display_history[last_position:current_position]
        
        # Update position for this client
        self.display_history_positions[client_id] = current_position
        
        return {
            "messages": new_messages,
            "last_position": last_position,
            "current_position": current_position,
            "has_updates": len(new_messages) > 0,
            "timestamp": datetime.now().isoformat()
        }
    
    def reset_display_history(self) -> Dict[str, Any]:
        """
        Reset display history and positions.
        
        Returns:
            Confirmation dictionary
        """
        self.display_history.clear()
        self.display_history_positions.clear()
        return {
            "success": True,
            "message": "Display history reset successfully",
            "timestamp": datetime.now().isoformat()
        }


# Global chat controller instance
chat_controller = ChatController()


# Debugging functions for easy access
def debug_set_api_key(api_key: str):
    """Debug function to set API key"""
    return chat_controller.set_api_key(api_key)

def debug_reset_chat():
    """Debug function to reset chat"""
    return chat_controller.reset_chat()

def debug_get_status():
    """Debug function to get status"""
    return chat_controller.get_api_status()

def debug_send_message(message: str):
    """Debug function to send test message"""
    return chat_controller.send_message(message)

def debug_get_info():
    """Debug function to get debug info"""
    return chat_controller.get_debug_info() 