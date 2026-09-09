import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import Colors from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { useCellarContext } from '@/context/CellarContext';

const c = Colors.dark;

export default function SettingsScreen() {
  const { settings, saveSettings, resetData, stats } = useCellarContext();
  const [zip, setZip] = useState(settings.zipCode);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setZip(settings.zipCode);
  }, [settings.zipCode]);

  async function saveZip() {
    const cleaned = zip.trim();
    if (!/^\d{5}(-\d{4})?$/.test(cleaned)) {
      Alert.alert('Invalid ZIP', 'Enter a 5-digit US ZIP code (e.g. 94102).');
      return;
    }
    setSaving(true);
    try {
      await saveSettings({ zipCode: cleaned });
      Alert.alert('Saved', `Retail price estimates will use ZIP ${cleaned}.`);
    } finally {
      setSaving(false);
    }
  }

  function confirmReset() {
    Alert.alert(
      'Reset sample data?',
      'This replaces your cellar and tasting notes with the original demo catalog (~36 wines).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetData();
            setZip('94102');
            Alert.alert('Done', 'Sample cellar restored.');
          },
        },
      ]
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.section}>Location</Text>
      <Text style={styles.help}>
        Used by the demo price provider to estimate average local retail. Not live scrapes.
      </Text>
      <TextInput
        value={zip}
        onChangeText={setZip}
        keyboardType="number-pad"
        maxLength={10}
        placeholder="ZIP code"
        placeholderTextColor={c.textMuted}
        style={styles.input}
      />
      <Button title="Save ZIP" onPress={saveZip} loading={saving} style={{ marginTop: 12 }} />

      <Text style={[styles.section, { marginTop: 32 }]}>Cellar</Text>
      <View style={styles.card}>
        <Row label="Bottles in cellar" value={String(stats.bottles)} />
        <Row label="Distinct wines" value={String(stats.distinctWines)} />
        <Row label="Current ZIP" value={settings.zipCode} />
      </View>

      <Text style={[styles.section, { marginTop: 32 }]}>Demo vs real</Text>
      <Text style={styles.help}>
        Bottle ID, critic scores, and retail prices are demo stubs (`DemoBottleRecognizer`,
        `DemoProvider`). Persistence is local (AsyncStorage). Swap providers when you wire real APIs.
      </Text>

      <Button
        title="Reset sample data"
        variant="danger"
        onPress={confirmReset}
        style={{ marginTop: 24 }}
      />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background, padding: 20 },
  section: { color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  help: { color: c.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  input: {
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: c.text,
    fontSize: 18,
    minHeight: 52,
  },
  card: {
    backgroundColor: c.backgroundCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { color: c.textSecondary },
  rowValue: { color: c.text, fontWeight: '600' },
});
