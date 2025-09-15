import React, { useState, useRef, useEffect } from 'react';
import {
  FluentProvider,
  webLightTheme,
  Button,
  Textarea,
  Spinner,
  Text,
  Card,
  CardHeader,
  CardPreview,
  makeStyles,
  tokens,
  Caption1,
  Badge
} from "@fluentui/react-components";
import { Send24Regular, Settings24Regular } from "@fluentui/react-icons";

// Simplified types for Excel plugin
interface ChatMessage {
  sender: 'user' | 'noira' | 'system';
  text: string;
  timestamp?: string;
  isThinking?: boolean;
  messageId?: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  response?: string;
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

// Simplified API service for Excel
class ExcelChatApiService {
  public baseUrl = 'https://localhost:5001/api/chat';

  async setApiKey(apiKey: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/set-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
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

  async getStatus(): Promise<ChatStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
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

  async sendMessage(message: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
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

const useStyles = makeStyles({
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    padding: tokens.spacingVerticalM,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: tokens.spacingVerticalS,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
  },
  messageCard: {
    marginBottom: tokens.spacingVerticalXS,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    maxWidth: '80%',
  },
  noiraMessage: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  inputArea: {
    padding: tokens.spacingVerticalM,
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'flex-end',
  },
  textarea: {
    flex: 1,
    minHeight: '36px',
    maxHeight: '120px',
  },
  statusBadge: {
    marginLeft: tokens.spacingHorizontalXS,
  },
});

interface NoiraAppProps {
  title: string;
}

export default function NoiraApp({ title }: NoiraAppProps) {
  const styles = useStyles();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const apiService = useRef(new ExcelChatApiService());

  // Load status on mount
  useEffect(() => {
    refreshStatus();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const refreshStatus = async () => {
    const statusData = await apiService.current.getStatus();
    setStatus(statusData);
  };

  const handleSetApiKey = async () => {
    if (!apiKey.trim()) return;
    
    setLoading(true);
    const result = await apiService.current.setApiKey(apiKey.trim());
    
    if (result.success) {
      setApiKey('');
      setShowApiKeyInput(false);
      await refreshStatus();
      setMessages(prev => [...prev, {
        sender: 'system',
        text: 'API key set successfully! You can now start chatting.',
        timestamp: new Date().toISOString(),
        messageId: `system-${Date.now()}`
      }]);
    } else {
      setMessages(prev => [...prev, {
        sender: 'system',
        text: `Error setting API key: ${result.message}`,
        timestamp: new Date().toISOString(),
        messageId: `system-${Date.now()}`
      }]);
    }
    
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading || !status?.api_key_set) return;

    const userMessage = input.trim();
    setInput('');
    
    const userTimestamp = new Date().toISOString();
    const thinkingMessageId = `thinking-${Date.now()}`;
    
    setMessages(prev => [
      ...prev, 
      { 
        sender: 'user', 
        text: userMessage,
        timestamp: userTimestamp,
        messageId: `user-${Date.now()}`
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
        setMessages(prev => prev.map(msg => 
          msg.messageId === thinkingMessageId 
            ? { 
                sender: 'noira', 
                text: result.response!,
                timestamp: result.timestamp,
                messageId: `noira-${Date.now()}`
              }
            : msg
        ));
      } else {
        setMessages(prev => prev.map(msg => 
          msg.messageId === thinkingMessageId 
            ? { 
                sender: 'noira', 
                text: `Error: ${result.message || 'Unknown error occurred'}`,
                timestamp: result.timestamp,
                messageId: `error-${Date.now()}`
              }
            : msg
        ));
      }
    } catch (error) {
      setMessages(prev => prev.map(msg => 
        msg.messageId === thinkingMessageId 
          ? { 
              sender: 'noira', 
              text: `Connection error: ${error}`,
              timestamp: new Date().toISOString(),
              messageId: `error-${Date.now()}`
            }
          : msg
      ));
    }

    setLoading(false);
    await refreshStatus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStatusBadge = () => {
    if (!status) {
      return <Badge appearance="outline">Loading...</Badge>;
    }
    if (status.connected && status.api_key_set) {
      return <Badge appearance="filled" color="success">Connected</Badge>;
    }
    if (status.api_key_set) {
      return <Badge appearance="filled" color="warning">API Key Set</Badge>;
    }
    return <Badge appearance="filled" color="danger">Not Connected</Badge>;
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.sender === 'user';
    const isSystem = message.sender === 'system';
    
    return (
      <Card 
        key={message.messageId}
        className={`${styles.messageCard} ${isUser ? styles.userMessage : styles.noiraMessage}`}
      >
        <CardHeader
          header={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text weight="semibold">
                {isUser ? 'You' : isSystem ? 'System' : 'Noira'}
              </Text>
              {message.timestamp && (
                <Caption1>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </Caption1>
              )}
            </div>
          }
        />
        <CardPreview>
          {message.isThinking ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
              <Spinner size="tiny" />
              <Text italic>{message.text}</Text>
            </div>
          ) : (
            <Text style={{ whiteSpace: 'pre-wrap' }}>{message.text}</Text>
          )}
        </CardPreview>
      </Card>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Text weight="semibold">{title}</Text>
          <div className={styles.statusBadge}>
            {getStatusBadge()}
          </div>
        </div>
        <Button
          icon={<Settings24Regular />}
          appearance="subtle"
          onClick={() => setShowApiKeyInput(!showApiKeyInput)}
        />
      </div>

      {/* API Key Input */}
      {showApiKeyInput && (
        <Card style={{ margin: tokens.spacingVerticalM }}>
          <CardHeader header={<Text>OpenAI API Key</Text>} />
          <CardPreview>
            <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, alignItems: 'flex-end' }}>
              <Textarea
                placeholder="sk-..."
                value={apiKey}
                onChange={(_, data) => setApiKey(data.value)}
                style={{ flex: 1 }}
                disabled={loading}
              />
              <Button
                appearance="primary"
                onClick={handleSetApiKey}
                disabled={loading || !apiKey.trim()}
              >
                Set Key
              </Button>
            </div>
          </CardPreview>
        </Card>
      )}

      {/* Chat Messages */}
      <div className={styles.chatArea}>
        {messages.length === 0 && status?.api_key_set && (
          <Card>
            <CardPreview>
              <Text>
                Welcome to Noira! I'm your AI copilot for financial analysis. 
                Ask me anything about your Excel data or financial modeling.
              </Text>
            </CardPreview>
          </Card>
        )}
        
        {messages.map(renderMessage)}
        <div ref={chatEndRef} />
      </div>

      {/* Input Area */}
      <div className={styles.inputArea}>
        <Textarea
          className={styles.textarea}
          placeholder={status?.api_key_set ? "Ask Noira about your Excel data..." : "Please set your API key first"}
          value={input}
          onChange={(_, data) => setInput(data.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || !status?.api_key_set}
          resize="vertical"
        />
        <Button
          icon={<Send24Regular />}
          appearance="primary"
          onClick={sendMessage}
          disabled={loading || !input.trim() || !status?.api_key_set}
        />
      </div>
    </div>
  );
}
