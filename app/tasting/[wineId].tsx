import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { ScorePicker } from '@/components/ScorePicker';
import { useCellarContext } from '@/context/CellarContext';

const c = Colors.dark;

export default function TastingScreen() {
  const { wineId } = useLocalSearchParams<{ wineId: string }>();
  const { getWineById, logTasting, changeQty } = useCellarContext();
  const [title, setTitle] = useState('Log tasting');
  const [score, setScore] = useState(8);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [decrement, setDecrement] = useState(true);

  useEffect(() => {
    if (!wineId) return;
    getWineById(wineId).then((w) => {
      if (w) setTitle(`${w.producer} · ${w.vintage ?? 'NV'}`);
    });
  }, [wineId, getWineById]);

  async function save() {
    if (!wineId) return;
    setSaving(true);
    try {
      await logTasting({ wineId, score, notes: notes.trim() });
      if (decrement) {
        await changeQty(wineId, -1);
      }
      Alert.alert('Saved', 'Tasting note added.', [{ text: 'OK', onPress: () => router.back() }]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.lead}>Score out of 10 (half points allowed)</Text>
        <ScorePicker value={score} onChange={setScore} />
        <Text style={[styles.lead, { marginTop: 24 }]}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Aromas, palate, pairing, occasion…"
          placeholderTextColor={c.textMuted}
          multiline
          style={styles.notes}
        />
        <Button
          title={decrement ? 'Also drink 1 bottle (−1)' : 'Keep inventory unchanged'}
          variant="secondary"
          onPress={() => setDecrement((d) => !d)}
          style={{ marginTop: 12 }}
        />
        <Button title="Save tasting" onPress={save} loading={saving} style={{ marginTop: 12 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  lead: { color: c.textSecondary, marginBottom: 12, fontSize: 15 },
  notes: {
    minHeight: 120,
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    padding: 14,
    color: c.text,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
