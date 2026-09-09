import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useCellarContext } from '@/context/CellarContext';
import type { WineType } from '@/types/wine';

const c = Colors.dark;
const TYPES: WineType[] = ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified'];

export default function WineEditScreen() {
  const { mode, id } = useLocalSearchParams<{ mode?: string; id?: string }>();
  const isEdit = mode === 'edit' && !!id;
  const { getWineById, saveWine } = useCellarContext();

  const [producer, setProducer] = useState('');
  const [name, setName] = useState('');
  const [vintage, setVintage] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [grape, setGrape] = useState('');
  const [type, setType] = useState<WineType>('Red');
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!isEdit);

  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      const w = await getWineById(id);
      if (w) {
        setProducer(w.producer);
        setName(w.name);
        setVintage(w.vintage != null ? String(w.vintage) : '');
        setRegion(w.region);
        setCountry(w.country);
        setGrape(w.grape);
        setType(w.type);
        setQuantity(String(w.quantity));
        setNotes(w.notes ?? '');
        setImageUri(w.imageUri);
      }
      setLoaded(true);
    })();
  }, [isEdit, id, getWineById]);

  async function onSave() {
    if (!producer.trim() || !name.trim()) {
      Alert.alert('Missing fields', 'Producer and wine name are required.');
      return;
    }
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 0) {
      Alert.alert('Invalid quantity', 'Enter a non-negative whole number.');
      return;
    }
    let vintageNum: number | null = null;
    if (vintage.trim()) {
      vintageNum = parseInt(vintage, 10);
      if (Number.isNaN(vintageNum) || vintageNum < 1900 || vintageNum > 2100) {
        Alert.alert('Invalid vintage', 'Enter a year like 2018, or leave blank for NV.');
        return;
      }
    }

    setSaving(true);
    try {
      const wine = await saveWine({
        id: isEdit ? id : undefined,
        producer: producer.trim(),
        name: name.trim(),
        vintage: vintageNum,
        region: region.trim() || 'Unknown',
        country: country.trim() || 'Unknown',
        grape: grape.trim() || 'Unknown',
        type,
        quantity: qty,
        imageUri,
        notes: notes.trim() || null,
      });
      if (isEdit) {
        router.back();
      } else {
        router.replace(`/wine/${wine.id}`);
      }
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <View style={styles.screen} />;
  }

  return (
    <>
      <Stack.Screen options={{ title: isEdit ? 'Edit wine' : 'Add wine' }} />
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Field label="Producer" value={producer} onChangeText={setProducer} placeholder="e.g. Caymus" />
        <Field label="Wine name" value={name} onChangeText={setName} placeholder="e.g. Special Selection Cabernet" />
        <Field
          label="Vintage"
          value={vintage}
          onChangeText={setVintage}
          placeholder="Leave blank for NV"
          keyboardType="number-pad"
        />
        <Field label="Region" value={region} onChangeText={setRegion} placeholder="e.g. Napa Valley" />
        <Field label="Country" value={country} onChangeText={setCountry} placeholder="e.g. USA" />
        <Field label="Grape / blend" value={grape} onChangeText={setGrape} placeholder="e.g. Cabernet Sauvignon" />
        <Text style={styles.label}>Type</Text>
        <View style={styles.chips}>
          {TYPES.map((t) => (
            <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
          ))}
        </View>
        <Field
          label="Quantity"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
        />
        <Field
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Cellar notes (optional)"
          multiline
        />
        <Button title={isEdit ? 'Save changes' : 'Add to cellar'} onPress={onSave} loading={saving} />
      </ScrollView>
    </>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={c.textMuted}
        keyboardType={props.keyboardType}
        multiline={props.multiline}
        style={[styles.input, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 14 },
});
