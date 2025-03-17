import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import casesReducer from './slices/casesSlice';
import messagesReducer from './slices/messagesSlice';
import documentsReducer from './slices/documentsSlice';
import benefitsReducer from './slices/benefitsSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    cases: casesReducer,
    messages: messagesReducer,
    documents: documentsReducer,
    benefits: benefitsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in action payloads
        ignoredActions: ['auth/loginSuccess', 'messages/receiveMessage'],
      },
    }),
});

export default store; 