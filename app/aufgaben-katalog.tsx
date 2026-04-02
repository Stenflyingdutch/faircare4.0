import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TASK_CATALOG_BY_CATEGORY, TASK_CATEGORIES } from '@/lib/taskCatalog';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function AufgabenKatalogScreen() {
  const { addTask } = useMentalLoadFlow();
  const [activeCategory, setActiveCategory] = useState<string>(TASK_CATEGORIES[0]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Aufgabenkatalog</Text>
      <Text style={styles.text}>Kategorien auswählen und Aufgaben übernehmen.</Text>

      <View style={styles.row}>
        {TASK_CATEGORIES.map((category) => (
          <Pressable
            key={category}
            style={[styles.chip, activeCategory === category && styles.chipActive]}
            onPress={() => setActiveCategory(category)}
          >
            <Text>{category}</Text>
          </Pressable>
        ))}
      </View>

      {TASK_CATALOG_BY_CATEGORY[activeCategory].map((task) => (
        <View key={task} style={styles.card}>
          <Text style={styles.cardTitle}>{task}</Text>
          <Pressable
            style={styles.primary}
            onPress={() => {
              addTask(task, null, activeCategory);
              router.back();
            }}
          >
            <Text style={styles.primaryText}>Aufgabe übernehmen</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 10 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#dbeafe' },
  card: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, gap: 8 },
  cardTitle: { fontWeight: '700' },
  primary: { backgroundColor: '#2563eb', borderRadius: 8, padding: 10 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
