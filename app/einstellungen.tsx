import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';
import type { AgeGroup } from '@/lib/mentalLoadQuestions';

type ChildProfile = {
  id: string;
  name: string;
  birthday: string;
};

const AGE_GROUPS: AgeGroup[] = ['0-1', '1-3', '3-6', '6-12', '12-18'];

function getAgeGroupFromBirthday(birthday: string): AgeGroup | null {
  if (!birthday) {
    return null;
  }

  const parsed = new Date(birthday);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const now = new Date();
  const ageInYears = (now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  if (ageInYears < 1) return '0-1';
  if (ageInYears < 3) return '1-3';
  if (ageInYears < 6) return '3-6';
  if (ageInYears < 12) return '6-12';
  return '12-18';
}

export default function EinstellungenScreen() {
  const { user, logout } = useAuth();
  const { session, setChildrenCount, setAgeGroups } = useMentalLoadFlow();
  const [name, setName] = useState(session.initiatorUser?.displayName ?? user?.displayName ?? '');
  const [email, setEmail] = useState(session.initiatorUser?.email ?? user?.email ?? '');
  const [children, setChildren] = useState<ChildProfile[]>(
    Array.from({ length: session.anonymousQuizSession.childrenCount }).map((_, index) => ({
      id: `child-${index + 1}`,
      name: '',
      birthday: '',
    })),
  );

  const detectedAgeGroups = useMemo(() => {
    const groups = new Set<AgeGroup>();
    children.forEach((child) => {
      const group = getAgeGroupFromBirthday(child.birthday);
      if (group) {
        groups.add(group);
      }
    });
    return Array.from(groups);
  }, [children]);

  useEffect(() => {
    setChildrenCount(children.length);
    setAgeGroups(detectedAgeGroups);
  }, [children.length, detectedAgeGroups, setAgeGroups, setChildrenCount]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Einstellungen</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Dein Konto</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" />
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="E-Mail-Adresse" autoCapitalize="none" />
        <Pressable style={styles.danger} onPress={logout}><Text style={styles.dangerText}>Logout</Text></Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Kinder</Text>
        <Text style={styles.text}>Name und Geburtstag eintragen – die Altersgruppe wird automatisch erkannt.</Text>

        {children.map((child, index) => (
          <View key={child.id} style={styles.childCard}>
            <Text style={styles.fieldTitle}>Kind {index + 1}</Text>
            <TextInput
              style={styles.input}
              value={child.name}
              onChangeText={(value) => {
                setChildren((prev) => prev.map((item) => (item.id === child.id ? { ...item, name: value } : item)));
              }}
              placeholder="Name"
            />
            <TextInput
              style={styles.input}
              value={child.birthday}
              onChangeText={(value) => {
                setChildren((prev) => prev.map((item) => (item.id === child.id ? { ...item, birthday: value } : item)));
              }}
              placeholder="Geburtstag (YYYY-MM-DD)"
            />
            <Text style={styles.ageHint}>Altersgruppe: {getAgeGroupFromBirthday(child.birthday) ?? '–'}</Text>
          </View>
        ))}

        <View style={styles.row}>
          <Pressable
            style={styles.secondary}
            onPress={() => {
              setChildren((prev) => [...prev, { id: `child-${Date.now()}`, name: '', birthday: '' }]);
            }}
          >
            <Text style={styles.secondaryText}>Kind hinzufügen</Text>
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={() => {
              setChildren((prev) => prev.slice(0, -1));
            }}
          >
            <Text style={styles.secondaryText}>Letztes Kind entfernen</Text>
          </Pressable>
        </View>

        <Text style={styles.fieldTitle}>Erkannte Altersgruppen</Text>
        <View style={styles.wrap}>
          {AGE_GROUPS.map((group) => (
            <View key={group} style={[styles.chip, detectedAgeGroups.includes(group) && styles.chipActive]}>
              <Text>{group}</Text>
            </View>
          ))}
        </View>
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
  childCard: { borderWidth: 1, borderColor: '#dbeafe', borderRadius: 10, padding: 10, gap: 8, backgroundColor: '#f8fbff' },
  fieldTitle: { fontWeight: '700', marginTop: 6 },
  ageHint: { color: '#475569' },
  row: { flexDirection: 'row', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 10, flex: 1 },
  secondaryText: { textAlign: 'center', fontWeight: '600' },
  danger: { backgroundColor: '#ef4444', borderRadius: 10, padding: 10 },
  dangerText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
