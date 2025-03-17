import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { login, clearError } from '../store/slices/authSlice';
import theme from '../theme';

// Validation schema
const LoginSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Email is required'),
  password: Yup.string().required('Password is required'),
});

const LoginScreen = ({ route }) => {
  const { setIsAuthenticated } = route.params;
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  // Update the parent state when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      setIsAuthenticated(true);
    }
  }, [isAuthenticated, setIsAuthenticated]);

  // Show error as snackbar when it occurs
  useEffect(() => {
    if (error) {
      setSnackbarVisible(true);
    }
  }, [error]);

  const handleLogin = async (values) => {
    await dispatch(login(values));
  };

  const dismissSnackbar = () => {
    setSnackbarVisible(false);
    dispatch(clearError());
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/logo-placeholder.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Incenta Employee Advocacy</Text>
        </View>

        <View style={styles.formContainer}>
          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={LoginSchema}
            onSubmit={handleLogin}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched }) => (
              <>
                <TextInput
                  label="Email"
                  value={values.email}
                  onChangeText={handleChange('email')}
                  onBlur={handleBlur('email')}
                  error={touched.email && errors.email}
                  style={styles.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {touched.email && errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}

                <TextInput
                  label="Password"
                  value={values.password}
                  onChangeText={handleChange('password')}
                  onBlur={handleBlur('password')}
                  error={touched.password && errors.password}
                  secureTextEntry
                  style={styles.input}
                />
                {touched.password && errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}

                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={styles.button}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={theme.colors.surface} />
                  ) : (
                    'Login'
                  )}
                </Button>
              </>
            )}
          </Formik>

          <View style={styles.forgotPasswordContainer}>
            <Button mode="text" onPress={() => console.log('Forgot password')}>
              Forgot Password?
            </Button>
          </View>
        </View>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={dismissSnackbar}
          duration={3000}
          action={{
            label: 'Dismiss',
            onPress: dismissSnackbar,
          }}
        >
          {error}
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.l,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: theme.spacing.m,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  formContainer: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.l,
    borderRadius: theme.borderRadius.m,
    elevation: theme.elevation.medium,
  },
  input: {
    marginBottom: theme.spacing.s,
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: theme.spacing.m,
    marginTop: -theme.spacing.xs,
  },
  button: {
    marginTop: theme.spacing.m,
    paddingVertical: theme.spacing.s,
  },
  forgotPasswordContainer: {
    marginTop: theme.spacing.m,
    alignItems: 'center',
  },
});

export default LoginScreen; 