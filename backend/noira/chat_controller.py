"""
chat_controller.py

Chat window controller for KANOSYM. Handles OpenAI API integration, chat history management, 
and debugging features for the Noira AI assistant.
"""

import json
import os
import logging
import re
from typing import List, Dict, Optional, Any
from datetime import datetime
from openai import OpenAI
import sys
import os
# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from file_manager import FileManager
from noira.file_access_service import NoiraFileAccessService
from noira.tools import NOIRA_TOOLS

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
        self.model: str = "gpt-4.1"
        self.max_tokens: int = 9998
        self.temperature: float = 0.7
        
        # Initialize file access service
        self.file_manager = FileManager()
        self.file_access_service = NoiraFileAccessService(self.file_manager)
        
        # Add welcome message
        self.chat_history.append({
            "role": "assistant",
            "content": """Hi! I'm **Noira**, your quantum portfolio modeling assistant. How can I help you today?""",
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
    
    def send_message(self, message: str, context: Optional[Dict[str, Any]] = None, use_tools: bool = True) -> Dict[str, Any]:
        """
        Send a message to the OpenAI API and get response, optionally using function calling.
        
        Args:
            message: User message to send
            context: Optional context about current portfolio/analysis state
            use_tools: Whether to enable function calling for data retrieval (default: True)
            
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
            logger.info("=" * 60)
            logger.info(f"🤖 SENDING MESSAGE TO NOIRA (tools={'enabled' if use_tools else 'disabled'})")
            logger.info("=" * 60)
            logger.info(f"Model: {self.model}")
            logger.info(f"Max Tokens: {self.max_tokens}")
            logger.info(f"Temperature: {self.temperature}")
            logger.info(f"Use Tools: {use_tools}")
            
            # Get recent chat history
            recent_history = self.chat_history[-10:] if len(self.chat_history) > 10 else self.chat_history
            
            enhanced_context = context.copy() if context else {}
            tool_results = []
            all_tool_calls = []  # Track all tool calls across iterations
            thinking_responses = []  # Track all thinking responses for usage
            
            # Unified thinking and response loop
            final_response = None
            
            if use_tools:
                iteration = 0
                max_iterations = 30  # Increased to allow retries and multiple thinking steps
                
                while iteration < max_iterations and final_response is None:
                    iteration += 1
                    logger.info(f"\n🧠 THINKING ITERATION {iteration}: Processing...")
                    
                    thinking_system_prompt = self._build_system_message(enhanced_context) + """

REMINDER - CRITICAL MESSAGE SEPARATION RULES:

Remember the critical format requirements from your system prompt:
- Tool calls MUST be in their own message WITHOUT any tags
- You CANNOT combine tool calls with <thinking> tags in the same message
- You CANNOT combine tool calls with <response> tags in the same message
- <thinking> and <response> tags can appear together ONLY AFTER tool results

CORRECT WORKFLOW:
1. If you need tools: Send tool calls (NO TAGS AT ALL)
2. Wait for tool results
3. THEN send message with <thinking> and/or <response> tags

INCORRECT (DO NOT DO THIS):
<thinking>
Let me check the project...
[tool calls here]
</thinking>

CORRECT (DO THIS INSTEAD):
Message 1: [Just tool calls, no tags]
Message 2 (after results): 
<thinking>
The tools succeeded...
</thinking>
<response>
Here's what I found...
</response>

IMPORTANT: 
- To execute any plan or perform actions, you MUST call the appropriate tools
- If the user has approved your plan, send tool calls WITHOUT any tags
- You cannot complete tasks without using tools - thinking alone is not enough

TOOL ERROR HANDLING:
- If a tool returns an error, analyze it in your NEXT message using <thinking> tags
- Common issues: wrong project name, missing parameters, etc.
- Retry with corrected parameters if it makes sense
- Don't retry the same failing call more than 2 times

Remember: Tool calls first (no tags), thinking/response later!"""
                    
                    # Add action reminder if needed
                    if enhanced_context.get("needs_action"):
                        thinking_system_prompt += f"\n\n⚠️ IMPORTANT: {enhanced_context.get('reminder', '')}\n"
                        # Clear the reminder after adding it
                        enhanced_context.pop("needs_action", None)
                        enhanced_context.pop("reminder", None)
                    
                    # Include previous tool results in context
                    if tool_results:
                        thinking_system_prompt += "\n\nPrevious tool results:\n"
                        for tr in tool_results:
                            if tr["result"]["success"]:
                                thinking_system_prompt += f"- {tr['result']['summary']}\n"
                    
                    thinking_messages = [
                        {"role": "system", "content": thinking_system_prompt}
                    ]
                    thinking_messages.extend(recent_history)
                    thinking_messages.append({"role": "user", "content": message})
                    
                    # Add previous tool calls to conversation
                    for tc in all_tool_calls:
                        thinking_messages.append(tc["assistant_message"])
                        # Add each tool response individually
                        for tool_resp in tc["tool_responses"]:
                            thinking_messages.append(tool_resp)
                    
                    # Get thinking response with potential tool calls
                    thinking_response = self.client.chat.completions.create(
                        model=self.model,
                        messages=thinking_messages,
                        tools=NOIRA_TOOLS,
                        tool_choice="auto",
                        max_tokens=9998,
                        temperature=0.3  # Lower temperature for reasoning
                    )
                    
                    # Store thinking response for usage tracking
                    thinking_responses.append(thinking_response)
                    
                    # Log Noira's full reply with tags
                    thinking_content = thinking_response.choices[0].message.content
                    if thinking_content:
                        logger.info(f"\n🤔 NOIRA'S REPLY:\n{'-' * 40}")
                        logger.info(thinking_content)
                        logger.info('-' * 40)
                        
                        # Check for response tags
                        response_match = re.search(r'<response>(.*?)</response>', thinking_content, re.DOTALL)
                        if response_match:
                            final_response = response_match.group(1).strip()
                            logger.info("✅ Found final response in tags, exiting thinking loop...")
                            break
                    
                    # Check if there are tool calls
                    if not thinking_response.choices[0].message.tool_calls:
                        # No tools called - check if there's a response
                        if not response_match:
                            # No tools AND no response tags - this shouldn't happen
                            logger.warning("⚠️ No tool calls and no response tags found. Prompting for action...")
                            
                            # Add a reminder to the context for next iteration
                            enhanced_context["needs_action"] = True
                            enhanced_context["reminder"] = "You must either call a tool to proceed with your plan OR provide a final response to the user in <response></response> tags. Remember: plans cannot be executed without tool calls - thinking alone is not enough! You also cannot respond to the user without using <response> tags: they will not see your response."
                            
                            # Continue to next iteration which will remind Noira to take action
                            continue
                        else:
                            # Has response tags but no tools - this is fine, we already have final_response
                            logger.info("✅ No tools needed, response provided.")
                            break
                    
                    # Execute tool calls
                    logger.info(f"\n🔧 TOOL CALLS ({len(thinking_response.choices[0].message.tool_calls)} total):")
                    logger.info("=" * 60)
                    
                    # Log each tool call before execution
                    for i, tc in enumerate(thinking_response.choices[0].message.tool_calls, 1):
                        logger.info(f"\n📌 Tool Call #{i}:")
                        logger.info(f"   Tool: {tc.function.name}")
                        logger.info(f"   Arguments: {tc.function.arguments}")
                    logger.info("=" * 60)
                    
                    # Store the assistant message with tool calls
                    assistant_msg_with_tools = {
                        "role": "assistant",
                        "content": thinking_response.choices[0].message.content or "",
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments
                                }
                            } for tc in thinking_response.choices[0].message.tool_calls
                        ]
                    }
                    
                    tool_responses = []
                    
                    for tool_call in thinking_response.choices[0].message.tool_calls:
                        tool_name = tool_call.function.name
                        tool_args = json.loads(tool_call.function.arguments)
                        
                        result = self.file_access_service.execute_tool_call(tool_name, tool_args)
                        tool_results.append({
                            "tool_name": tool_name,
                            "result": result
                        })
                        
                        # Create tool response message
                        tool_response_content = json.dumps(result["data"] if result["success"] else {"error": result.get("error", "Unknown error")})
                        tool_responses.append({
                            "role": "tool",
                            "content": tool_response_content,
                            "tool_call_id": tool_call.id
                        })
                        
                        if result["success"]:
                            logger.info(f"\n✅ Tool {tool_name} succeeded:")
                            logger.info(f"   Summary: {result['summary']}")
                            if 'data' in result and isinstance(result['data'], dict):
                                # Log key data points without overwhelming the log
                                if 'blocks_placed' in result['data']:
                                    logger.info(f"   Blocks placed: {result['data']['blocks_placed']}")
                                elif 'project_id' in result['data']:
                                    logger.info(f"   Project ID: {result['data']['project_id']}")
                            enhanced_context["tool_data"] = enhanced_context.get("tool_data", [])
                            enhanced_context["tool_data"].append({
                                "tool": tool_name,
                                "data": result["data"],
                                "summary": result["summary"]
                            })
                        else:
                            logger.error(f"\n❌ Tool {tool_name} failed:")
                            logger.error(f"   Error: {result['error']}")
                    
                    # Store this iteration's calls and responses
                    all_tool_calls.append({
                        "assistant_message": assistant_msg_with_tools,
                        "tool_responses": tool_responses  # Store individual tool responses
                    })
                
                if iteration >= max_iterations:
                    logger.warning("⚠️ Reached maximum tool iterations, proceeding to response phase...")
            else:
                # Direct response mode (no tools)
                logger.info("\n💬 DIRECT RESPONSE MODE (no tools)...")
                
                # Simple prompt for direct responses
                direct_prompt = self._build_system_message(enhanced_context) + """

Please provide a direct response to the user's question.
Remember the critical format requirements:
- You MUST wrap any thinking/analysis in <thinking></thinking> tags
- You MUST wrap your response in <response></response> tags
- Both tags can appear in the same message

Example:
<thinking>
This is a straightforward question about X. Let me provide a clear answer.
</thinking>

<response>
Your answer here...
</response>
"""
                
                messages = [
                    {"role": "system", "content": direct_prompt}
                ]
                messages.extend(recent_history)
                messages.append({"role": "user", "content": message})
                
                # Generate direct response
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    max_tokens=self.max_tokens,
                    temperature=self.temperature
                )
                
                response_content = response.choices[0].message.content
                if response_content:
                    # Log full content with tags
                    logger.info(f"\n💬 NOIRA'S REPLY:\n{'-' * 40}")
                    logger.info(response_content)
                    logger.info('-' * 40)
                    
                    # Extract response from tags if present
                    response_match = re.search(r'<response>(.*?)</response>', response_content, re.DOTALL)
                    if response_match:
                        final_response = response_match.group(1).strip()
                    else:
                        # Use the whole response if no tags found
                        final_response = response_content
                
                # Store response for usage tracking
                thinking_responses.append(response)
            
            # Response Phase: Handle final response
            if final_response:
                # We already have the response from the thinking loop
                logger.info("\n💬 Using response from thinking phase...")
                assistant_response = final_response
            else:
                # Fallback: Generate response if no response tags were found
                logger.info("\n💬 FALLBACK: Generating response without tags...")
                
                # Build system message with any tool results
                system_message = self._build_system_message(enhanced_context)
                
                if tool_results:
                    # Create a more detailed summary of what was done
                    tool_summary = "\n\nHere's a summary of what I did:\n"
                    actions_taken = []
                    
                    for tr in tool_results:
                        if tr["result"]["success"]:
                            tool_name = tr["tool_name"]
                            summary = tr["result"]["summary"]
                            
                            # Group similar actions for better readability
                            if tool_name == "create_project":
                                actions_taken.append(f"✅ Created project: {summary}")
                            elif tool_name == "add_block":
                                actions_taken.append(f"✅ Added block: {summary}")
                            elif tool_name == "fetch_asset_volatility":
                                actions_taken.append(f"✅ Fetched volatility data: {summary}")
                            elif tool_name == "estimate_correlation_matrix":
                                actions_taken.append(f"✅ Estimated correlations: {summary}")
                            elif tool_name == "update_block_parameters":
                                actions_taken.append(f"✅ Updated parameters: {summary}")
                            elif tool_name == "load_project":
                                actions_taken.append(f"📋 Loaded: {summary}")
                            elif tool_name == "run_sensitivity_test":
                                actions_taken.append(f"🚀 Ran test: {summary}")
                            else:
                                actions_taken.append(f"- {summary}")
                    
                    tool_summary += "\n".join(actions_taken)
                    tool_summary += "\n\nBased on these actions, here's my response:"
                    system_message += tool_summary
                
                # Build final messages
                messages = [{"role": "system", "content": system_message}]
                messages.extend(recent_history)
                messages.append({"role": "user", "content": message})
                
                # Generate response
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    max_tokens=self.max_tokens,
                    temperature=self.temperature
                )
                
                fallback_content = response.choices[0].message.content
                if fallback_content:
                    # Log full content with tags
                    logger.info(f"\n💬 NOIRA'S FALLBACK REPLY:\n{'-' * 40}")
                    logger.info(fallback_content)
                    logger.info('-' * 40)
                    
                    # Extract response from tags if present
                    response_match = re.search(r'<response>(.*?)</response>', fallback_content, re.DOTALL)
                    if response_match:
                        assistant_response = response_match.group(1).strip()
                    else:
                        # Use the whole content if no tags found
                        logger.warning("⚠️ No response tags found in fallback response, using full content")
                        assistant_response = fallback_content
                else:
                    assistant_response = ""
            
            logger.info(f"\n✅ RESPONSE GENERATED ({len(tool_results)} tools used)")
            logger.info(f"Response Length: {len(assistant_response) if assistant_response else 0} characters")
            
            # Calculate total usage
            total_usage = {
                "prompt_tokens": 0,
                "completion_tokens": 0,
                "total_tokens": 0
            }
            
            # Add usage from all responses (thinking and final)
            # In the new architecture, thinking_responses contains all API calls
            for thinking_resp in thinking_responses:
                if hasattr(thinking_resp, 'usage'):
                    total_usage["prompt_tokens"] += thinking_resp.usage.prompt_tokens
                    total_usage["completion_tokens"] += thinking_resp.usage.completion_tokens
                    total_usage["total_tokens"] += thinking_resp.usage.total_tokens
            
            # Add usage from fallback response if it exists
            if 'response' in locals() and hasattr(response, 'usage'):
                total_usage["prompt_tokens"] += response.usage.prompt_tokens
                total_usage["completion_tokens"] += response.usage.completion_tokens
                total_usage["total_tokens"] += response.usage.total_tokens
            
            # Add to chat history
            self.chat_history.append({"role": "user", "content": message})
            self.chat_history.append({"role": "assistant", "content": assistant_response})
            
            logger.info(f"📚 Chat History Updated: {len(self.chat_history)} total messages")
            logger.info("=" * 60)
            
            # Extract tool details for frontend display
            tool_details = []
            for tr in tool_results:
                if tr["result"]["success"]:
                    tool_details.append({
                        "tool_name": tr["tool_name"],
                        "summary": tr["result"]["summary"]
                    })
            
            return {
                "success": True,
                "response": assistant_response,
                "tools_used": len(tool_results),
                "tool_details": tool_details,
                "usage": total_usage,
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
        # Get the path to the system prompt file
        current_dir = os.path.dirname(os.path.abspath(__file__))
        prompt_file = os.path.join(current_dir, 'system_prompt.txt')
        
        # Read the system prompt from file
        try:
            with open(prompt_file, 'r', encoding='utf-8') as f:
                base_message = f.read().strip()
        except FileNotFoundError:
            logger.warning(f"System prompt file not found at {prompt_file}. Using default prompt.")
            base_message = """You are Noira, an AI chatbot specialized in quantum portfolio analysis and the KANOSYM platform. 
        
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
- Keep your responses as short as possible without sacrificing clarity or detail. If you can respond in a single sentence, do so.

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