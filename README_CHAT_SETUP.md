# KANOSYM Chat Integration Setup

## Backend Setup

1. **Install Python Dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Start the Backend Server**
   ```bash
   cd backend
   python api.py
   ```
   The backend will run on `http://localhost:5001`

## Frontend Setup

1. **Install Node Dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the Frontend**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

## Using the Chat System

### First Time Setup
1. Click the ⚙️ button in the Noira panel header
2. Enter your OpenAI API key (starts with `sk-`)
3. Click "Set" to validate and save the key
4. The status indicator should turn green

### Chat Features
- **Send Messages**: Type in the input field and press Enter or click Send
- **Reset Chat**: Use the debug panel to clear conversation history
- **Debug Mode**: Toggle for additional debugging information
- **Settings**: Adjust model, max tokens, and temperature

### Debug Panel Features
- **API Key Management**: Set and validate OpenAI API keys
- **Status Monitoring**: Check connection and authentication status
- **Chat Reset**: Clear conversation history
- **Model Settings**: Configure GPT model, tokens, and temperature
- **Debug Toggle**: Enable/disable debug mode

### API Endpoints
- `POST /api/chat/set-api-key` - Set OpenAI API key
- `GET /api/chat/status` - Get connection status
- `POST /api/chat/send` - Send message to AI
- `POST /api/chat/reset` - Reset chat history
- `GET /api/chat/debug` - Get debug information

## Troubleshooting

### Backend Issues
- Ensure Python dependencies are installed
- Check if port 5001 is available
- Verify OpenAI API key is valid

### Frontend Issues
- Check if backend is running on port 5001
- Verify CORS is enabled (handled by flask-cors)
- Check browser console for network errors

### API Key Issues
- Ensure API key starts with `sk-`
- Verify API key has sufficient credits
- Check OpenAI API usage limits