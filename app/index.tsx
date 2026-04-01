import { Link, Redirect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function WillkommenScreen() {
  const { user } = useAuth();

  if (user) {
    return <Redirect href="/startseite" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Willkommen bei FairCare</Text>
      <Text style={styles.text}>Bitte melden Sie sich an oder registrieren Sie sich.</Text>

      <Link href="/anmelden" style={styles.button}>
        Anmelden
      </Link>

      <Link href="/registrieren" style={styles.buttonSecondary}>
        Registrieren
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  text: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563eb',
    color: '#fff',
    textAlign: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    fontWeight: '700',
  },
  buttonSecondary: {
    backgroundColor: '#e5e7eb',
    color: '#111827',
    textAlign: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    fontWeight: '700',
  },
});
