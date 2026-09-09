import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { Button } from '@/components/ui/Button';
import { useCellarContext } from '@/context/CellarContext';
import { demoBottleRecognizer } from '@/services/DemoBottleRecognizer';
import {
  createOnDeviceBottleRecognizer,
  OnDeviceRecognitionError,
} from '@/services/OnDeviceBottleRecognizer';
import {
  createVisionBottleRecognizer,
  VisionRecognitionError,
} from '@/services/VisionBottleRecognizer';

const c = Colors.dark;

export default function ScanScreen() {
  const { wines, settings } = useCellarContext();
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasApiKey = Boolean(settings.openaiApiKey?.trim());
  const usingDemo = settings.useDemoRecognition === true;
  const preferCloud = settings.preferCloudVision === true && hasApiKey;

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
      quality: 0.85,
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
      quality: 0.85,
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
      let match;
      if (usingDemo) {
        match = await demoBottleRecognizer.identifyFromImage(uri, wines);
      } else if (preferCloud) {
        match = await createVisionBottleRecognizer(
          settings.openaiApiKey,
          settings.recognitionModel || 'gpt-4o-mini'
        ).identifyFromImage(uri, wines);
      } else {
        try {
          match = await createOnDeviceBottleRecognizer().identifyFromImage(uri, wines);
        } catch (ocrErr) {
          // Optional secondary: if OCR module missing and a key exists, offer cloud once.
          if (
            ocrErr instanceof OnDeviceRecognitionError &&
            ocrErr.code === 'unavailable' &&
            hasApiKey
          ) {
            match = await createVisionBottleRecognizer(
              settings.openaiApiKey,
              settings.recognitionModel || 'gpt-4o-mini'
            ).identifyFromImage(uri, wines);
          } else {
            throw ocrErr;
          }
        }
      }

      if (!usingDemo && match.confidence < 0.6 && !match.matchedWineId) {
        Alert.alert(
          'Low confidence',
          `Read “${match.producer} ${match.name}” (${Math.round(match.confidence * 100)}%). You can still confirm and edit on the next screen, or retry with a clearer photo.`,
          [
            { text: 'Retry', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () =>
                router.push({
                  pathname: '/identify/confirm',
                  params: { imageUri: uri, payload: JSON.stringify(match) },
                }),
            },
          ]
        );
        return;
      }

      router.push({
        pathname: '/identify/confirm',
        params: {
          imageUri: uri,
          payload: JSON.stringify(match),
        },
      });
    } catch (e) {
      const msg =
        e instanceof OnDeviceRecognitionError || e instanceof VisionRecognitionError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Could not identify this bottle. Try again.';

      if (e instanceof OnDeviceRecognitionError && e.code === 'unavailable') {
        Alert.alert('Development build required', msg, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => router.push('/(tabs)/settings') },
        ]);
      } else if (
        e instanceof VisionRecognitionError &&
        (e.code === 'no_key' || e.code === 'invalid_key')
      ) {
        Alert.alert('Recognition failed', msg, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => router.push('/(tabs)/settings') },
        ]);
      } else if (
        (e instanceof OnDeviceRecognitionError || e instanceof VisionRecognitionError) &&
        e.code === 'no_label'
      ) {
        Alert.alert('No label text found', msg, [{ text: 'OK' }]);
      } else {
        Alert.alert('Identification failed', msg);
      }
    } finally {
      setBusy(false);
    }
  }

  const lead = usingDemo
    ? 'Demo recognition is ON — Identify uses a local stub that does not read the photo. Turn it off in Settings to use free on-device OCR (dev build) or optional cloud vision.'
    : preferCloud
      ? 'Photograph a bottle label or pick from your library. Identify prefers cloud vision (OpenAI) because “Prefer cloud vision” is on in Settings.'
      : 'Photograph a bottle label or pick from your library. Identify runs free on-device OCR (Apple Vision / ML Kit) — requires a development build, not Expo Go. Optional OpenAI cloud fallback is in Settings.';

  return (
    <View style={styles.screen}>
      <Text style={styles.lead}>{lead}</Text>

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
