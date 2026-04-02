import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { theme } from '@/lib/theme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

function RootNavigation() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: theme.colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '600' },
        contentStyle: { backgroundColor: theme.colors.background },
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
      <Stack.Screen name="ergebnisse" options={{ title: 'Ergebnisse' }} />
      <Stack.Screen name="karten" options={{ title: 'Karten' }} />
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
