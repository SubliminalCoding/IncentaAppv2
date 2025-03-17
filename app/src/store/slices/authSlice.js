import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// API base URL
const API_URL = 'http://localhost:5000/api';

// Async thunks for authentication actions
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password,
      });
      
      // Store tokens in AsyncStorage
      await AsyncStorage.setItem('accessToken', response.data.tokens.accessToken);
      await AsyncStorage.setItem('refreshToken', response.data.tokens.refreshToken);
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (token) {
        await axios.post(`${API_URL}/auth/logout`, {}, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      
      // Clear tokens from AsyncStorage
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      
      return null;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token found');
      }
      
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refreshToken,
      });
      
      // Store new access token in AsyncStorage
      await AsyncStorage.setItem('accessToken', response.data.accessToken);
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Token refresh failed' });
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await axios.get(`${API_URL}/auth/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to get user data' });
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Authentication failed';
      })
      
      // Logout cases
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      .addCase(logout.rejected, (state) => {
        state.loading = false;
        // We still want to log the user out even if the API call fails
        state.isAuthenticated = false;
        state.user = null;
      })
      
      // Refresh token cases
      .addCase(refreshToken.fulfilled, (state) => {
        state.isAuthenticated = true;
      })
      .addCase(refreshToken.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
      })
      
      // Get current user cases
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to get user data';
      });
  },
});

export const { clearError } = authSlice.actions;

export default authSlice.reducer; 