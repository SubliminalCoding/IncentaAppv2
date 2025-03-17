import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// API base URL
const API_URL = 'http://localhost:5000/api';

// Async thunks
export const fetchDocuments = createAsyncThunk(
  'documents/fetchDocuments',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      const response = await axios.get(`${API_URL}/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to fetch documents' });
    }
  }
);

export const uploadDocument = createAsyncThunk(
  'documents/uploadDocument',
  async ({ uri, name, type, caseId }, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      // Create form data
      const formData = new FormData();
      formData.append('file', {
        uri,
        name,
        type
      });
      
      if (caseId) {
        formData.append('caseId', caseId);
      }
      
      const response = await axios.post(`${API_URL}/documents`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to upload document' });
    }
  }
);

export const downloadDocument = createAsyncThunk(
  'documents/downloadDocument',
  async (documentId, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (!token) {
        throw new Error('No access token found');
      }
      
      // Get document metadata
      const metadataResponse = await axios.get(`${API_URL}/documents/${documentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      const { fileName } = metadataResponse.data;
      
      // Download document
      const downloadResponse = await axios.get(`${API_URL}/documents/${documentId}/download`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob',
      });
      
      // Save to file system
      const fileUri = FileSystem.documentDirectory + fileName;
      const base64Data = await blobToBase64(downloadResponse.data);
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return {
        documentId,
        fileUri,
        fileName,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data || { error: 'Failed to download document' });
    }
  }
);

// Helper function to convert blob to base64
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = () => {
      reject(new Error('Failed to convert blob to base64'));
    };
    reader.readAsDataURL(blob);
  });
};

// Documents slice
const documentsSlice = createSlice({
  name: 'documents',
  initialState: {
    documents: [],
    loading: false,
    error: null,
    downloadedDocuments: {},
  },
  reducers: {
    clearDocumentError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch documents
      .addCase(fetchDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.loading = false;
        state.documents = action.payload.documents;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to fetch documents';
      })
      
      // Upload document
      .addCase(uploadDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.loading = false;
        state.documents.unshift(action.payload.document);
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to upload document';
      })
      
      // Download document
      .addCase(downloadDocument.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(downloadDocument.fulfilled, (state, action) => {
        state.loading = false;
        const { documentId, fileUri, fileName } = action.payload;
        state.downloadedDocuments[documentId] = { fileUri, fileName };
      })
      .addCase(downloadDocument.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.error || 'Failed to download document';
      });
  },
});

export const { clearDocumentError } = documentsSlice.actions;

export default documentsSlice.reducer; 