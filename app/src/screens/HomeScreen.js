import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, Text, ActivityIndicator, Appbar } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import { logout, getCurrentUser } from '../store/slices/authSlice';
import theme from '../theme';

const HomeScreen = ({ route, navigation }) => {
  const { setIsAuthenticated } = route.params;
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);

  // Fetch current user info on mount
  useEffect(() => {
    dispatch(getCurrentUser());
  }, [dispatch]);

  const handleLogout = async () => {
    await dispatch(logout());
    setIsAuthenticated(false);
  };

  if (loading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Incenta" subtitle="Employee Dashboard" />
        <Appbar.Action icon="bell" onPress={() => console.log('Notifications')} />
        <Appbar.Action icon="logout" onPress={handleLogout} />
      </Appbar.Header>

      <ScrollView style={styles.scrollView}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome back, {user.firstName} {user.lastName}!
          </Text>
          <Text style={styles.subtitleText}>
            Here's what's happening with your cases.
          </Text>
        </View>

        <View style={styles.statsSection}>
          <Card style={styles.statsCard}>
            <Card.Content>
              <Title>0</Title>
              <Paragraph>Active Cases</Paragraph>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard}>
            <Card.Content>
              <Title>0</Title>
              <Paragraph>Pending Actions</Paragraph>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard}>
            <Card.Content>
              <Title>0</Title>
              <Paragraph>Resolved</Paragraph>
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Need help with a healthcare issue?</Title>
            <Paragraph>
              Start a new case to connect with an advocacy specialist who can help you
              resolve billing issues, understand your benefits, or navigate the
              healthcare system.
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button mode="contained" onPress={() => console.log('Create case')}>
              Create New Case
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Recent Cases</Title>
            <Paragraph style={styles.emptyState}>
              You don't have any recent cases.
            </Paragraph>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Your Benefits</Title>
            <Paragraph>
              Member ID: {user.memberId || 'Not available'}
            </Paragraph>
            <Paragraph>
              Plan: {user.planId || 'Not available'}
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button mode="outlined" onPress={() => console.log('View benefits')}>
              View Benefits Details
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Need Help?</Title>
            <Paragraph>
              Access our knowledge base for answers to common questions about your
              healthcare benefits.
            </Paragraph>
          </Card.Content>
          <Card.Actions>
            <Button mode="outlined" onPress={() => console.log('View FAQ')}>
              View FAQ
            </Button>
          </Card.Actions>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.m,
    color: theme.colors.text,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
    padding: theme.spacing.m,
  },
  welcomeSection: {
    marginBottom: theme.spacing.l,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  subtitleText: {
    fontSize: 16,
    color: theme.colors.text,
    opacity: 0.7,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.m,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    elevation: theme.elevation.small,
  },
  card: {
    marginBottom: theme.spacing.m,
    elevation: theme.elevation.small,
  },
  emptyState: {
    fontStyle: 'italic',
    opacity: 0.6,
    marginTop: theme.spacing.s,
  },
});

export default HomeScreen; 