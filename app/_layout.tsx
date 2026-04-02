import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { MentalLoadFlowProvider } from '@/contexts/MentalLoadFlowContext';

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
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="kinderanzahl" options={{ title: 'Kinderanzahl' }} />
      <Stack.Screen name="altersgruppen" options={{ title: 'Altersgruppen' }} />
      <Stack.Screen name="quiz-intro" options={{ title: 'Quiz Intro' }} />
      <Stack.Screen name="quiz" options={{ title: 'Mental-Load Quiz' }} />
      <Stack.Screen name="quiz-teaser" options={{ title: 'Quiz Ergebnis' }} />
      <Stack.Screen name="registrieren" options={{ title: 'Ergebnis freischalten' }} />
      <Stack.Screen name="eigenes-ergebnis" options={{ title: 'Dein Ergebnis' }} />
      <Stack.Screen name="partner-einladen" options={{ title: 'Partner einladen' }} />
      <Stack.Screen name="einladungscode" options={{ title: 'Einladungscode' }} />
      <Stack.Screen name="invite/[token]" options={{ title: 'Einladung' }} />
      <Stack.Screen name="gemeinsames-ergebnis" options={{ title: 'Gemeinsames Ergebnis' }} />
      <Stack.Screen name="ziele-auswahl" options={{ title: 'Ziele' }} />
      <Stack.Screen name="ziel-fokus" options={{ title: 'Ziel-Fokus' }} />
      <Stack.Screen name="aufgaben" options={{ title: 'Aufgaben' }} />
      <Stack.Screen name="aufgaben-katalog" options={{ title: 'Aufgabenkatalog' }} />
      <Stack.Screen name="aufgaben-bestaetigung" options={{ title: 'Bestätigung' }} />
      <Stack.Screen name="weekly-review" options={{ title: 'Weekly Review' }} />
      <Stack.Screen name="startseite" options={{ title: 'Startseite' }} />
      <Stack.Screen name="einstellungen" options={{ title: 'Einstellungen' }} />
      <Stack.Screen name="familie-beitreten" options={{ title: 'Code eingeben' }} />
      <Stack.Screen name="anmelden" options={{ title: 'Einloggen' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <MentalLoadFlowProvider>
        <RootNavigation />
      </MentalLoadFlowProvider>
    </AuthProvider>
  );
}
