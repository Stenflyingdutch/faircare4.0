import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function RootNavigation() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="anmelden" options={{ title: 'Anmelden' }} />
      <Stack.Screen name="registrieren" options={{ title: 'Registrieren' }} />
      <Stack.Screen name="startseite" options={{ title: 'Startseite' }} />
      <Stack.Screen name="familie-erstellen" options={{ title: 'Familie erstellen' }} />
      <Stack.Screen name="familie-beitreten" options={{ title: 'Familie beitreten' }} />
      <Stack.Screen name="kind-anlegen" options={{ title: 'Kind anlegen' }} />
      <Stack.Screen name="quiz" options={{ title: 'Fairness-Quiz' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
