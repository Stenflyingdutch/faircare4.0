import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';
import type { AgeGroup } from '@/lib/mentalLoadQuestions';

const AGE_GROUPS: AgeGroup[] = ['0-1', '1-3', '3-6', '6-12', '12-18'];

export default function EinstellungenScreen() {
  const { user, logout } = useAuth();
  const { session, setChildrenCount, setAgeGroups, getInviteCode } = useMentalLoadFlow();
  const [name, setName] = useState(session.initiatorUser?.displayName ?? user?.displayName ?? '');
  const [email, setEmail] = useState(session.initiatorUser?.email ?? user?.email ?? '');

  const selectedAges = useMemo(() => new Set(session.anonymousQuizSession.childrenAgeGroups), [session.anonymousQuizSession.childrenAgeGroups]);

  const updateChildrenCount = (next: number) => {
    if (next < 0) {
      return;
    }
    setChildrenCount(next);
  };

  const toggleAge = (group: AgeGroup) => {
    const updated = new Set(selectedAges);
    if (updated.has(group)) {
      updated.delete(group);
    } else {
      updated.add(group);
    }
    setAgeGroups(Array.from(updated));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Einstellungen</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dein Konto</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="E-Mail-Adresse" autoCapitalize="none" />
        <Pressable style={styles.secondary}><Text style={styles.secondaryText}>Kennwort ändern</Text></Pressable>
        <Pressable style={styles.danger} onPress={logout}><Text style={styles.dangerText}>Logout</Text></Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Eure Familie</Text>
        <Text style={styles.text}>Partnerstatus: {session.pairOrHouseholdContext.inviteStatus}</Text>
        <Text style={styles.text}>Einladungscode: {getInviteCode()}</Text>

        <Text style={styles.fieldTitle}>Kinder verwalten</Text>
        <View style={styles.row}>
          <Pressable style={styles.counterButton} onPress={() => updateChildrenCount(session.anonymousQuizSession.childrenCount - 1)}>
            <Text style={styles.counterLabel}>−</Text>
          </Pressable>
          <Text style={styles.counterValue}>{session.anonymousQuizSession.childrenCount}</Text>
          <Pressable style={styles.counterButton} onPress={() => updateChildrenCount(session.anonymousQuizSession.childrenCount + 1)}>
            <Text style={styles.counterLabel}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.fieldTitle}>Altersgruppen</Text>
        <View style={styles.wrap}>
          {AGE_GROUPS.map((group) => (
            <Pressable key={group} style={[styles.chip, selectedAges.has(group) && styles.chipActive]} onPress={() => toggleAge(group)}>
              <Text>{group}</Text>
            </Pressable>
          ))}
        </View>

        {session.needsQuizRefresh && (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>Deine Familiendaten haben sich geändert. Ein aktualisiertes Quiz hilft, eure Ergebnisse anzupassen.</Text>
            <Pressable style={styles.primary}><Text style={styles.primaryText}>Quiz aktualisieren</Text></Pressable>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>App</Text>
        <Text style={styles.text}>Familienkontext: {session.pairOrHouseholdContext.id}</Text>
        <Pressable style={styles.secondary}><Text style={styles.secondaryText}>Daten zurücksetzen</Text></Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, gap: 8 },
  sectionTitle: { fontWeight: '700', fontSize: 18 },
  text: { color: '#334155' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  fieldTitle: { fontWeight: '700', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  counterButton: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  counterLabel: { fontSize: 20, fontWeight: '700' },
  counterValue: { fontSize: 18, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  primary: { backgroundColor: '#2563eb', borderRadius: 10, padding: 10 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10 },
  secondaryText: { textAlign: 'center', fontWeight: '600' },
  danger: { backgroundColor: '#ef4444', borderRadius: 10, padding: 10 },
  dangerText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  notice: { backgroundColor: '#eff6ff', borderRadius: 10, padding: 10, gap: 8 },
  noticeText: { color: '#1e3a8a' },
});
