import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URL
const API_URL = 'http://localhost:5000/api';

// Async thunks
export const fetchCases = createAsyncThunk(
  'cases/fetchCases',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await axios.get(`${API_URL}/cases`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch cases' });
    }
  }
);

export const createCase = createAsyncThunk(
  'cases/createCase',
  async (caseData, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await axios.post(`${API_URL}/cases`, caseData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to create case' });
    }
  }
);

// Cases slice
const casesSlice = createSlice({
  name: 'cases',
  initialState: {
    cases: [],
    currentCase: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCaseError: (state) => {
      state.error = null;
    },
    setCurrentCase: (state, action) => {
      state.currentCase = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch cases
      .addCase(fetchCases.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCases.fulfilled, (state, action) => {
        state.loading = false;
        state.cases = action.payload.cases;
      })
      .addCase(fetchCases.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch cases';
      })
      
      // Create case
      .addCase(createCase.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCase.fulfilled, (state, action) => {
        state.loading = false;
        state.cases.unshift(action.payload.case);
        state.currentCase = action.payload.case;
      })
      .addCase(createCase.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to create case';
      });
  },
});

export const { clearCaseError, setCurrentCase } = casesSlice.actions;

export default casesSlice.reducer; 