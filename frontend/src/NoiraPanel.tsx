import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Types for API responses
interface ChatMessage {
  sender: 'user' | 'noira';
  text: string;
  timestamp?: string;
  isThinking?: boolean;
  messageId?: string;
  toolsUsed?: string[];  // Tool names that were used
}

interface ApiResponse {
  success: boolean;
  message?: string;
  response?: string;
  tools_used?: number;
  tool_details?: Array<{
    tool_name: string;
    summary: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  timestamp: string;
}

interface ChatStatus {
  connected: boolean;
  api_key_set: boolean;
  model: string;
  debug_mode: boolean;
  chat_history_length: number;
  timestamp: string;
}

interface DebugInfo {
  api_key_set: boolean;
  api_key_preview: string | null;
  client_initialized: boolean;
  chat_history_length: number;
  debug_mode: boolean;
  settings: {
    model: string;
    max_tokens: number;
    temperature: number;
  };
  timestamp: string;
}

// API service class - UPDATED TO PORT 5001
class ChatApiService {
  public baseUrl = 'http://localhost:5001/api/chat';  // Changed from 5000 to 5001

  async setApiKey(apiKey: string): Promise<ApiResponse> {
    try {
      console.log('Setting API key...');
      const response = await fetch(`${this.baseUrl}/set-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('API key result:', result);
      return result;
    } catch (error) {
      console.error('API key error:', error);
      return {
        success: false,
        message: `Connection error: ${error}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getStatus(): Promise<ChatStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      console.log('Status result:', result);
      return result;
    } catch (error) {
      console.error('Status error:', error);
      return {
        connected: false,
        api_key_set: false,
        model: 'unknown',
        debug_mode: false,
        chat_history_length: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async sendMessage(message: string, context?: any): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async resetChat(): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/reset`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getDebugInfo(): Promise<DebugInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/debug`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      console.log('Debug info result:', result);
      return result;
    } catch (error) {
      console.error('Debug info error:', error);
      return {
        api_key_set: false,
        api_key_preview: null,
        client_initialized: false,
        chat_history_length: 0,
        debug_mode: false,
        settings: {
          model: 'unknown',
          max_tokens: 0,
          temperature: 0,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getChatHistory(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/history`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Chat history error:', error);
      return {
        history: [],
        length: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  async toggleDebugMode(enabled: boolean): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/debug/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async updateSettings(settings: { model?: string; max_tokens?: number; temperature?: number }): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Debug Panel Component
function DebugPanel({ 
  apiService, 
  onClose, 
  debugInfo, 
  onRefresh 
}: { 
  apiService: ChatApiService; 
  onClose: () => void; 
  debugInfo: DebugInfo; 
  onRefresh: () => void; 
}) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(debugInfo.settings.model);
  const [maxTokens, setMaxTokens] = useState(debugInfo.settings.max_tokens);
  const [temperature, setTemperature] = useState(debugInfo.settings.temperature);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSetApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setMessage('Please enter an API key');
      return;
    }
    setLoading(true);
    setMessage('Setting API key...');
    
    try {
      const result = await apiService.setApiKey(apiKey.trim());
      setMessage(result.message || 'Unknown error');
      
      if (result.success) {
        setApiKey('');
        // Wait a moment then refresh
        setTimeout(async () => {
          await onRefresh();
          setMessage('API key set successfully!');
        }, 1000);
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
    
    setLoading(false);
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Updating settings...');
    
    try {
      const result = await apiService.updateSettings({
        model,
        max_tokens: maxTokens,
        temperature,
      });
      setMessage(result.message || 'Settings updated');
      
      if (result.success) {
        setTimeout(async () => {
          await onRefresh();
          setMessage('Settings updated successfully!');
        }, 1000);
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
    
    setLoading(false);
  };

  const handleToggleDebugMode = async () => {
    setLoading(true);
    setMessage('Toggling debug mode...');
    
    try {
      const result = await apiService.toggleDebugMode(!debugInfo.debug_mode);
      setMessage(result.message || 'Debug mode toggled');
      
      if (result.success) {
        setTimeout(async () => {
          await onRefresh();
          setMessage(`Debug mode ${!debugInfo.debug_mode ? 'enabled' : 'disabled'}!`);
        }, 1000);
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
    
    setLoading(false);
  };

  const handleResetChat = async () => {
    if (!confirm('Are you sure you want to reset the chat history?')) return;
    
    setLoading(true);
    setMessage('Resetting chat...');
    
    try {
      const result = await apiService.resetChat();
      setMessage(result.message || 'Chat reset');
      
      if (result.success) {
        setTimeout(async () => {
          await onRefresh();
          setMessage('Chat history reset successfully!');
        }, 1000);
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
    
    setLoading(false);
  };

  const testBackendConnection = async () => {
    setLoading(true);
    setMessage('Testing backend connection...');
    
    try {
      const response = await fetch('http://localhost:5001/api/chat/status');  // Updated to 5001
      if (response.ok) {
        setMessage('✅ Backend is running and accessible');
      } else {
        setMessage(`❌ Backend responded with error: ${response.status}`);
      }
    } catch (error) {
      setMessage(`❌ Cannot connect to backend: ${error}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto text-gray-900">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Debug Panel</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Connection Test */}
        <div className="mb-4">
          <button
            onClick={testBackendConnection}
            disabled={loading}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Backend Connection'}
          </button>
        </div>

        {/* Status */}
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
          <div className="text-sm space-y-1 text-gray-600">
            <div>API Key: {debugInfo.api_key_set ? '✅ Set' : '❌ Not set'}</div>
            <div>Client: {debugInfo.client_initialized ? '✅ Connected' : '❌ Not connected'}</div>
            <div>Debug Mode: {debugInfo.debug_mode ? '✅ On' : '❌ Off'}</div>
            <div>Chat History: {debugInfo.chat_history_length} messages</div>
            <div>Model: {debugInfo.settings.model}</div>
            {debugInfo.api_key_preview && (
              <div>Key Preview: {debugInfo.api_key_preview}</div>
            )}
          </div>
        </div>

        {/* API Key Input */}
        <div className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">OpenAI API Key</h3>
          <form onSubmit={handleSetApiKey} className="space-y-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-900"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !apiKey.trim()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Setting...' : 'Set API Key'}
            </button>
          </form>
        </div>

        {/* Settings */}
        <div className="mb-4">
          <h3 className="font-semibold text-gray-700 mb-2">Settings</h3>
          <form onSubmit={handleUpdateSettings} className="space-y-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
                disabled={loading}
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4.1">GPT-4.1</option>
                <option value="o3-mini">o3-mini</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Max Tokens</label>
              <input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value) || 1000)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-gray-900"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Settings'}
            </button>
          </form>
        </div>

        {/* Actions */}
        <div className="mb-4 space-y-2">
          <button
            onClick={handleToggleDebugMode}
            disabled={loading}
            className="w-full bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
          >
            {loading ? 'Toggling...' : `${debugInfo.debug_mode ? 'Disable' : 'Enable'} Debug Mode`}
          </button>
          <button
            onClick={handleResetChat}
            disabled={loading}
            className="w-full bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Resetting...' : 'Reset Chat History'}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-3 rounded text-sm ${
            message.includes('Error') || message.includes('error') || message.includes('❌')
              ? 'bg-red-100 border border-red-300 text-red-700'
              : message.includes('✅') || message.includes('successfully')
              ? 'bg-green-100 border border-green-300 text-green-700'
              : 'bg-blue-100 border border-blue-300 text-blue-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

// Add MessageContent component before the main component
function MessageContent({ message, isUser }: { message: ChatMessage; isUser: boolean }) {
  // Format timestamp consistently
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return '';
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return '';
    }
  };

  if (isUser) {
    // Plain text for user messages
    return (
      <div className="whitespace-pre-line">
        {message.text}
        {message.timestamp && (
          <div className="text-xs opacity-50 mt-1">
            {formatTimestamp(message.timestamp)}
          </div>
        )}
      </div>
    );
  }

  // Markdown rendering for Noira messages
  return (
    <div>
      {/* Tool usage indicator */}
      {message.toolsUsed && message.toolsUsed.length > 0 && (
        <div className="text-xs text-zinc-400 mb-2 pb-2 border-b border-zinc-700">
          <span className="text-zinc-500">📊 Used tools: </span>
          {message.toolsUsed.map((tool, index) => (
            <span key={index}>
              {index > 0 && ', '}
              <span className="text-zinc-300">{tool}</span>
            </span>
          ))}
        </div>
      )}
      <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Customize styling for dark theme
          h1: ({children}) => <h1 className="text-lg font-bold text-zinc-100 mb-2">{children}</h1>,
          h2: ({children}) => <h2 className="text-base font-bold text-zinc-100 mb-2">{children}</h2>,
          h3: ({children}) => <h3 className="text-sm font-bold text-zinc-100 mb-1">{children}</h3>,
          p: ({children}) => <p className="text-zinc-100 mb-2 last:mb-0">{children}</p>,
          strong: ({children}) => <strong className="font-bold text-zinc-50">{children}</strong>,
          em: ({children}) => <em className="italic text-zinc-200">{children}</em>,
          ul: ({children}) => <ul className="list-disc list-inside text-zinc-100 mb-2 space-y-1">{children}</ul>,
          ol: ({children}) => <ol className="list-decimal list-inside text-zinc-100 mb-2 space-y-1">{children}</ol>,
          li: ({children}) => <li className="text-zinc-100">{children}</li>,
          code: ({children}) => <code className="bg-zinc-700 text-blue-300 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
          pre: ({children}) => <pre className="bg-zinc-700 text-zinc-100 p-2 rounded text-xs overflow-x-auto mb-2">{children}</pre>,
          blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-3 text-zinc-200 italic mb-2">{children}</blockquote>,
          table: ({children}) => <table className="w-full border-collapse border border-zinc-600 mb-2 text-xs">{children}</table>,
          thead: ({children}) => <thead className="bg-zinc-700">{children}</thead>,
          tbody: ({children}) => <tbody>{children}</tbody>,
          tr: ({children}) => <tr className="border-b border-zinc-600">{children}</tr>,
          th: ({children}) => <th className="border border-zinc-600 px-2 py-1 text-left font-bold text-zinc-100">{children}</th>,
          td: ({children}) => <td className="border border-zinc-600 px-2 py-1 text-zinc-100">{children}</td>,
          a: ({href, children}) => <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
        }}
      >
        {message.text}
      </ReactMarkdown>
      {message.timestamp && (
        <div className="text-xs opacity-50 mt-1">
          {formatTimestamp(message.timestamp)}
        </div>
      )}
      </div>
    </div>
  );
}

// Main NoiraPanel Component
export default function NoiraPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const apiService = useRef(new ChatApiService());

  // Load status on mount
  useEffect(() => {
    refreshStatus();
  }, []);

  // Load chat history on mount
  useEffect(() => {
    if (status?.api_key_set) {
      const loadInitialHistory = async () => {
        try {
          const historyData = await apiService.current.getChatHistory();
          if (historyData.history) {
            const formattedMessages = historyData.history.map((msg: any) => ({
              sender: msg.role === 'user' ? 'user' : 'noira',
              text: msg.content,
              timestamp: msg.timestamp
            }));
            setMessages(formattedMessages);
          }
        } catch (error) {
          console.error('Error loading chat history:', error);
        }
      };
      
      loadInitialHistory();
    }
  }, [status?.api_key_set]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Chat now works with direct message sending and receiving

  const refreshStatus = async () => {
    console.log('Refreshing status...');
    const [statusData, debugData] = await Promise.all([
      apiService.current.getStatus(),
      apiService.current.getDebugInfo(),
    ]);
    setStatus(statusData);
    setDebugInfo(debugData);
    console.log('Status refreshed:', { statusData, debugData });
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Immediately add user message for instant feedback
    const userTimestamp = new Date().toISOString();
    const thinkingMessageId = `thinking-${Date.now()}`;
    
    setMessages(prev => [
      ...prev, 
      { 
        sender: 'user', 
        text: userMessage,
        timestamp: userTimestamp
      },
      {
        sender: 'noira',
        text: 'Thinking...',
        isThinking: true,
        messageId: thinkingMessageId,
        timestamp: new Date().toISOString()
      }
    ]);
    
    setLoading(true);

    try {
      const result = await apiService.current.sendMessage(userMessage);
      
      if (result.success && result.response) {
        // Extract tool names from tool details
        const toolsUsed = result.tool_details?.map(detail => detail.tool_name) || [];
        
        // Replace thinking message with actual response
        setMessages(prev => prev.map(msg => 
          msg.messageId === thinkingMessageId 
            ? { 
                sender: 'noira', 
                text: result.response!,
                timestamp: result.timestamp,
                toolsUsed: toolsUsed.length > 0 ? toolsUsed : undefined
              }
            : msg
        ));
      } else {
        // Replace thinking message with error
        setMessages(prev => prev.map(msg => 
          msg.messageId === thinkingMessageId 
            ? { 
                sender: 'noira', 
                text: `Error: ${result.message || 'Unknown error occurred'}`,
                timestamp: result.timestamp 
              }
            : msg
        ));
      }
    } catch (error) {
      // Replace thinking message with connection error
      setMessages(prev => prev.map(msg => 
        msg.messageId === thinkingMessageId 
          ? { 
              sender: 'noira', 
              text: `Connection error: ${error}`,
              timestamp: new Date().toISOString()
            }
          : msg
      ));
    }

    setLoading(false);
    refreshStatus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusColor = () => {
    if (!status) return 'text-gray-500';
    if (status.connected && status.api_key_set) return 'text-green-500';
    if (status.api_key_set) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStatusText = () => {
    if (!status) return 'Loading...';
    if (status.connected && status.api_key_set) return 'Connected';
    if (status.api_key_set) return 'API Key Set';
    return 'Not Connected';
  };

  return (
    <div className="h-full w-full bg-zinc-900 text-zinc-200 p-0 flex flex-col" style={{ fontFamily: 'Menlo, Monaco, Courier New, monospace', fontSize: 13 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-base">Noira</span>
          <div className={`text-xs ${getStatusColor()}`}>
            ● {getStatusText()}
          </div>
          {isThinking && (
            <div className="flex items-center gap-1 text-xs text-blue-400">
              <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full"></div>
              Analyzing...
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
        {messages.map((msg, i) => (
          <div key={msg.messageId || i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`rounded-lg px-3 py-2 max-w-[80%] ${
              msg.sender === 'user' 
                ? 'bg-blue-600 text-white whitespace-pre-line' 
                : 'bg-zinc-800 text-zinc-100 border border-zinc-700'
            }`}>
              {msg.isThinking ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className="text-zinc-300 italic">{msg.text}</span>
                </div>
              ) : (
                <MessageContent message={msg} isUser={msg.sender === 'user'} />
              )}
            </div>
          </div>
        ))}
        
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <form
        className="flex items-center gap-2 p-2 border-t border-zinc-800 bg-zinc-900"
        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
      >
        <input
          className="flex-1 bg-zinc-800 text-zinc-100 rounded px-3 py-2 outline-none border border-zinc-700 focus:border-blue-500 disabled:opacity-50"
          placeholder={status?.api_key_set ? "Ask Noira..." : "Set API key in debug panel first..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || !status?.api_key_set}
        />
        <button
          type="submit"
          disabled={loading || !input.trim() || !status?.api_key_set}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => setShowDebug(true)}
          className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition"
          title="Debug Panel"
        >
          ⚙️
        </button>
      </form>

      {/* Debug Panel */}
      {showDebug && debugInfo && (
        <DebugPanel
          apiService={apiService.current}
          onClose={() => setShowDebug(false)}
          debugInfo={debugInfo}
          onRefresh={refreshStatus}
        />
      )}
    </div>
  );
}
