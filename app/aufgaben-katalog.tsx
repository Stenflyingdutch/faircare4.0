import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TASK_CATALOG_BY_CATEGORY, TASK_CATEGORIES } from '@/lib/taskCatalog';
import { useMentalLoadFlow } from '@/contexts/MentalLoadFlowContext';

export default function AufgabenKatalogScreen() {
  const { addTask } = useMentalLoadFlow();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Aufgabenkatalog</Text>
      <Text style={styles.text}>Kategorien auswählen und Aufgaben übernehmen.</Text>

      {TASK_CATEGORIES.map((category) => {
        const isExpanded = expandedCategory === category;
        return (
          <View key={category} style={styles.categorySection}>
            <Pressable
              style={[styles.categoryHeader, isExpanded && styles.categoryHeaderActive]}
              onPress={() => setExpandedCategory(isExpanded ? null : category)}
            >
              <Text style={styles.categoryTitle}>{category}</Text>
              <Text style={styles.categoryCaret}>{isExpanded ? '▴' : '▾'}</Text>
            </Pressable>

            {isExpanded && (
              <View style={styles.categoryContent}>
                {TASK_CATALOG_BY_CATEGORY[category].map((task) => (
                  <View key={task} style={styles.card}>
                    <Text style={styles.cardTitle}>{task}</Text>
                    <Pressable
                      style={styles.primary}
                      onPress={() => {
                        addTask(task, null, category);
                        router.back();
                      }}
                    >
                      <Text style={styles.primaryText}>Aufgabe übernehmen</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 10 },
  title: { fontSize: 30, fontWeight: '700' },
  text: { color: '#334155' },
  categorySection: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, overflow: 'hidden' },
  categoryHeader: { padding: 12, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryHeaderActive: { backgroundColor: '#eff6ff' },
  categoryTitle: { fontWeight: '700', color: '#0f172a' },
  categoryCaret: { color: '#334155', fontSize: 18 },
  categoryContent: { padding: 10, gap: 8, backgroundColor: '#f8fafc' },
  card: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, gap: 8 },
  cardTitle: { fontWeight: '700' },
  primary: { backgroundColor: '#2563eb', borderRadius: 8, padding: 10 },
  primaryText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
