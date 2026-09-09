import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { useCellarContext } from '@/context/CellarContext';
import { demoBottleRecognizer } from '@/services/DemoBottleRecognizer';

const c = Colors.dark;

export default function ScanScreen() {
  const { wines } = useCellarContext();
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function ensureCameraPermission() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera access needed', 'Enable camera permission to photograph wine labels.');
      return false;
    }
    return true;
  }

  async function ensureLibraryPermission() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photos access needed', 'Enable photo library access to pick a bottle image.');
      return false;
    }
    return true;
  }

  async function takePhoto() {
    if (!(await ensureCameraPermission())) return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (!result.canceled && result.assets[0]) {
      setUri(result.assets[0].uri);
    }
  }

  async function pickPhoto() {
    if (!(await ensureLibraryPermission())) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
      mediaTypes: ['images'],
    });
    if (!result.canceled && result.assets[0]) {
      setUri(result.assets[0].uri);
    }
  }

  async function identify() {
    if (!uri) return;
    setBusy(true);
    try {
      const match = await demoBottleRecognizer.identifyFromImage(uri, wines);
      router.push({
        pathname: '/identify/confirm',
        params: {
          imageUri: uri,
          payload: JSON.stringify(match),
        },
      });
    } catch (e) {
      Alert.alert('Identification failed', 'Demo recognizer could not process this image. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.lead}>
        Photograph a bottle label or pick from your library. Demo recognition matches against your
        cellar — no live vision API.
      </Text>

      <View style={styles.preview}>
        {uri ? (
          <Image source={{ uri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="camera-outline" size={56} color={c.tintLight} />
            <Text style={styles.placeholderText}>Bottle photo</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Button title="Take photo" onPress={takePhoto} style={{ flex: 1 }} />
        <Button title="Pick photo" variant="secondary" onPress={pickPhoto} style={{ flex: 1 }} />
      </View>
      <Button
        title={busy ? 'Identifying…' : 'Identify bottle'}
        onPress={identify}
        loading={busy}
        disabled={!uri}
        style={{ marginTop: 12 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background, padding: 20 },
  lead: { color: c.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 16 },
  preview: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: c.backgroundCard,
    borderWidth: 1,
    borderColor: c.border,
    minHeight: 320,
  },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  placeholderText: { color: c.textMuted, fontSize: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
