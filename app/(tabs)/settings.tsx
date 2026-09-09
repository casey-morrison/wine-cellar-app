import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import Colors from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { useCellarContext } from '@/context/CellarContext';

const c = Colors.dark;

export default function SettingsScreen() {
  const { settings, saveSettings, resetData, stats } = useCellarContext();
  const [zip, setZip] = useState(settings.zipCode);
  const [apiKey, setApiKey] = useState(settings.openaiApiKey ?? '');
  const [model, setModel] = useState(settings.recognitionModel || 'gpt-4o-mini');
  const [useDemo, setUseDemo] = useState(settings.useDemoRecognition === true);
  const [savingZip, setSavingZip] = useState(false);
  const [savingVision, setSavingVision] = useState(false);

  useEffect(() => {
    setZip(settings.zipCode);
    setApiKey(settings.openaiApiKey ?? '');
    setModel(settings.recognitionModel || 'gpt-4o-mini');
    setUseDemo(settings.useDemoRecognition === true);
  }, [settings]);

  async function saveZip() {
    const cleaned = zip.trim();
    if (!/^\d{5}(-\d{4})?$/.test(cleaned)) {
      Alert.alert('Invalid ZIP', 'Enter a 5-digit US ZIP code (e.g. 94102).');
      return;
    }
    setSavingZip(true);
    try {
      await saveSettings({ zipCode: cleaned });
      Alert.alert('Saved', `Retail price estimates will use ZIP ${cleaned}.`);
    } finally {
      setSavingZip(false);
    }
  }

  async function saveVisionSettings() {
    const cleanedModel = model.trim() || 'gpt-4o-mini';
    setSavingVision(true);
    try {
      await saveSettings({
        openaiApiKey: apiKey.trim(),
        recognitionModel: cleanedModel,
        useDemoRecognition: useDemo,
      });
      setModel(cleanedModel);
      Alert.alert(
        'Saved',
        useDemo
          ? 'Demo recognition enabled for Identify.'
          : apiKey.trim()
            ? 'OpenAI vision recognition ready on Identify.'
            : 'Key cleared. Add a key (or enable demo) to identify bottles.'
      );
    } finally {
      setSavingVision(false);
    }
  }

  async function onToggleDemo(next: boolean) {
    setUseDemo(next);
    await saveSettings({ useDemoRecognition: next });
  }

  function confirmReset() {
    Alert.alert(
      'Reset sample data?',
      'This replaces your cellar and tasting notes with the original demo catalog (~36 wines). Vision settings (API key) are kept.',
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
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.section}>Label recognition</Text>
      <Text style={styles.help}>
        Identify sends the bottle photo to OpenAI vision, extracts producer / name / vintage, then
        fuzzy-matches your cellar. Get a key at platform.openai.com — it stays on this device only
        (AsyncStorage) and is never committed. Each Identify call uses a small amount of API credit.
      </Text>
      <Text style={styles.label}>OpenAI API key</Text>
      <TextInput
        value={apiKey}
        onChangeText={setApiKey}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        placeholder="sk-…"
        placeholderTextColor={c.textMuted}
        style={styles.input}
      />
      <Text style={[styles.label, { marginTop: 14 }]}>Recognition model</Text>
      <TextInput
        value={model}
        onChangeText={setModel}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="gpt-4o-mini"
        placeholderTextColor={c.textMuted}
        style={styles.input}
      />
      <View style={styles.switchRow}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.switchLabel}>Use demo recognition</Text>
          <Text style={styles.switchHelp}>
            Offline stub that does not read the photo. Off by default — only for testing without a
            key.
          </Text>
        </View>
        <Switch
          value={useDemo}
          onValueChange={onToggleDemo}
          trackColor={{ false: c.border, true: c.tintMuted }}
          thumbColor={useDemo ? c.tintLight : c.textMuted}
        />
      </View>
      <Button
        title="Save recognition settings"
        onPress={saveVisionSettings}
        loading={savingVision}
        style={{ marginTop: 14 }}
      />

      <Text style={[styles.section, { marginTop: 32 }]}>Location</Text>
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
      <Button title="Save ZIP" onPress={saveZip} loading={savingZip} style={{ marginTop: 12 }} />

      <Text style={[styles.section, { marginTop: 32 }]}>Cellar</Text>
      <View style={styles.card}>
        <Row label="Bottles in cellar" value={String(stats.bottles)} />
        <Row label="Distinct wines" value={String(stats.distinctWines)} />
        <Row label="Current ZIP" value={settings.zipCode} />
        <Row
          label="Vision"
          value={
            settings.useDemoRecognition
              ? 'Demo'
              : settings.openaiApiKey?.trim()
                ? `OpenAI · ${settings.recognitionModel || 'gpt-4o-mini'}`
                : 'Key not set'
          }
        />
      </View>

      <Text style={[styles.section, { marginTop: 32 }]}>Privacy</Text>
      <Text style={styles.help}>
        When real recognition is on, bottle photos are uploaded to OpenAI for OCR. Critic scores and
        retail prices remain local demo stubs (`DemoProvider`).
      </Text>

      <Button
        title="Reset sample data"
        variant="danger"
        onPress={confirmReset}
        style={{ marginTop: 24 }}
      />
    </ScrollView>
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
  screen: { flex: 1, backgroundColor: c.background },
  section: { color: c.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  help: { color: c.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  label: { color: c.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: c.inputBg,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: c.text,
    fontSize: 16,
    minHeight: 52,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  switchLabel: { color: c.text, fontSize: 16, fontWeight: '600' },
  switchHelp: { color: c.textMuted, fontSize: 13, lineHeight: 18, marginTop: 4 },
  card: {
    backgroundColor: c.backgroundCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    padding: 14,
    gap: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { color: c.textSecondary },
  rowValue: { color: c.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
