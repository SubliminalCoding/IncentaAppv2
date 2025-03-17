import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API base URL
const API_URL = 'http://localhost:5000/api';

// Async thunks
export const fetchBenefits = createAsyncThunk(
  'benefits/fetchBenefits',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await axios.get(`${API_URL}/benefits/plan`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch benefits' });
    }
  }
);

export const fetchIdCard = createAsyncThunk(
  'benefits/fetchIdCard',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await axios.get(`${API_URL}/benefits/id-card`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch ID card' });
    }
  }
);

export const fetchDeductibles = createAsyncThunk(
  'benefits/fetchDeductibles',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await axios.get(`${API_URL}/benefits/deductibles`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch deductibles' });
    }
  }
);

// Benefits slice
const benefitsSlice = createSlice({
  name: 'benefits',
  initialState: {
    plan: null,
    idCard: null,
    deductibles: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearBenefitsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch benefits
      .addCase(fetchBenefits.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBenefits.fulfilled, (state, action) => {
        state.loading = false;
        state.plan = action.payload;
      })
      .addCase(fetchBenefits.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch benefits';
      })
      
      // Fetch ID card
      .addCase(fetchIdCard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIdCard.fulfilled, (state, action) => {
        state.loading = false;
        state.idCard = action.payload;
      })
      .addCase(fetchIdCard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch ID card';
      })
      
      // Fetch deductibles
      .addCase(fetchDeductibles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDeductibles.fulfilled, (state, action) => {
        state.loading = false;
        state.deductibles = action.payload;
      })
      .addCase(fetchDeductibles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch deductibles';
      });
  },
});

export const { clearBenefitsError } = benefitsSlice.actions;

export default benefitsSlice.reducer; 