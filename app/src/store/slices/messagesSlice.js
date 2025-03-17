import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URL
const API_URL = 'http://localhost:5000/api';

// Async thunks
export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async (conversationId, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await axios.get(`${API_URL}/conversations/${conversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch messages' });
    }
  }
);

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async ({ conversationId, messageData }, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await axios.post(`${API_URL}/conversations/${conversationId}/messages`, messageData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to send message' });
    }
  }
);

// Messages slice
const messagesSlice = createSlice({
  name: 'messages',
  initialState: {
    messages: {},
    activeConversationId: null,
    loading: false,
    error: null,
  },
  reducers: {
    setActiveConversation: (state, action) => {
      state.activeConversationId = action.payload;
    },
    receiveMessage: (state, action) => {
      const { conversationId, message } = action.payload;
      
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      
      state.messages[conversationId].push(message);
    },
    clearMessageError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading = false;
        const { conversationId, messages } = action.payload;
        state.messages[conversationId] = messages;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch messages';
      })
      
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading = false;
        const { conversationId, message } = action.payload;
        
        if (!state.messages[conversationId]) {
          state.messages[conversationId] = [];
        }
        
        state.messages[conversationId].push(message);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to send message';
      });
  },
});

export const { setActiveConversation, receiveMessage, clearMessageError } = messagesSlice.actions;

export default messagesSlice.reducer; 