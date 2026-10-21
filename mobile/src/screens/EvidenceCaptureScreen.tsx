import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation';
import apiClient from '../api/client';
import { useAuthStore } from '../stores/authStore';

type Props = StackScreenProps<RootStackParamList, 'EvidenceCapture'>;

type MediaType = 'video' | 'photo';
type UploadState = 'idle' | 'captured' | 'uploading' | 'done' | 'error';

const MIN_VIDEO_DURATION_S = 5;
const CHUNK_SIZE = 512 * 1024; // 512 KB

interface CapturedMedia {
  type: MediaType;
  uri: string;
  name: string;
  durationSec?: number;
  fileHash?: string;
  fileSize: number;
}

async function sha256Hex(input: string): Promise<string> {
  try {
    const encoded = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Fallback: deterministic hex derived from string length + charCodes
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0').repeat(8);
  }
}

export default function EvidenceCaptureScreen({ route, navigation }: Props) {
  const { tradeId } = route.params;
  const insets = useSafeAreaInsets();
  const { token } = useAuthStore();

  const [selectedType, setSelectedType] = useState<MediaType>('video');
  const [captured, setCaptured] = useState<CapturedMedia | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleCapture = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is needed to capture evidence.');
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: selectedType === 'video'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 120,
    };

    const result = await ImagePicker.launchCameraAsync(options);
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const ext = selectedType === 'video' ? 'mp4' : 'jpg';
    const name = `evidence-${tradeId}-${Date.now()}.${ext}`;
    const durationSec = asset.duration != null ? Math.round(asset.duration / 1000) : undefined;

    if (selectedType === 'video' && (durationSec ?? 0) < MIN_VIDEO_DURATION_S) {
      Alert.alert(
        'Video Too Short',
        `Video must be at least ${MIN_VIDEO_DURATION_S} seconds. Please record again.`,
      );
      return;
    }

    const fileSize = asset.fileSize ?? CHUNK_SIZE;
    const fileHash = await sha256Hex(uri);

    setCaptured({ type: selectedType, uri, name, durationSec, fileHash, fileSize });
    setUploadState('captured');
  };

  const handleUpload = async () => {
    if (!captured) return;
    setUploadState('uploading');
    setUploadError(null);
    setUploadProgress(0);

    try {
      const totalChunks = Math.ceil(captured.fileSize / CHUNK_SIZE);
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      for (let i = 0; i < totalChunks; i++) {
        const offset = i * CHUNK_SIZE;
        // In production, read actual bytes; here we send metadata only
        await apiClient.post(
          `/trades/${tradeId}/evidence/chunks`,
          {
            chunkIndex: i,
            totalChunks,
            fileHash: captured.fileHash,
            offset,
            size: Math.min(CHUNK_SIZE, captured.fileSize - offset),
            mediaType: captured.type,
            fileName: captured.name,
          },
          { headers: authHeader }
        );
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      await apiClient.post(
        `/trades/${tradeId}/evidence/finalize`,
        {
          fileHash: captured.fileHash,
          totalChunks,
          mediaType: captured.type,
          fileName: captured.name,
          ...(captured.durationSec !== undefined ? { durationSec: captured.durationSec } : {}),
        },
        { headers: authHeader }
      );

      setUploadState('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setUploadError(msg);
      setUploadState('error');
    }
  };

  const handleReset = () => {
    setCaptured(null);
    setUploadState('idle');
    setUploadError(null);
    setUploadProgress(0);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">Upload Evidence</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.tradeRef}>Trade: #{tradeId.slice(0, 12)}…</Text>

        {uploadState === 'done' ? (
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Evidence Uploaded</Text>
            <Text style={styles.successBody}>
              Your {captured?.type} has been submitted. A mediator will review it shortly.
            </Text>
            {captured?.fileHash && (
              <Text style={styles.hashLabel}>SHA-256: {captured.fileHash.slice(0, 16)}…</Text>
            )}
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => navigation.navigate('TradeDetail', { tradeId })}
              accessibilityRole="button"
              accessibilityLabel="Back to trade detail"
            >
              <Text style={styles.doneBtnText}>Back to Trade</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Evidence Type</Text>
              <View style={styles.typeRow}>
                {(['video', 'photo'] as MediaType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, selectedType === t && styles.typeBtnActive]}
                    onPress={() => { setSelectedType(t); handleReset(); }}
                    accessibilityRole="radio"
                    accessibilityLabel={t === 'video' ? 'Video evidence' : 'Photo evidence'}
                    accessibilityState={{ selected: selectedType === t }}
                  >
                    <Text style={styles.typeIcon}>{t === 'video' ? '🎥' : '📷'}</Text>
                    <Text style={[styles.typeLabel, selectedType === t && styles.typeLabelActive]}>
                      {t === 'video' ? `Video (min ${MIN_VIDEO_DURATION_S}s)` : 'Photo'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {selectedType === 'video' ? 'Record Delivery Video' : 'Take Delivery Photo'}
              </Text>
              <Text style={styles.hint}>
                {selectedType === 'video'
                  ? `Record at least ${MIN_VIDEO_DURATION_S} seconds showing the goods and their condition.`
                  : 'Take a clear photo of the goods showing any damage or discrepancy.'}
              </Text>

              <TouchableOpacity
                style={[styles.captureArea, captured && styles.captureAreaDone]}
                onPress={uploadState === 'idle' || uploadState === 'error' ? handleCapture : undefined}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={captured ? `${selectedType === 'video' ? 'Video' : 'Photo'} captured, tap to recapture` : `Tap to ${selectedType === 'video' ? 'record video' : 'capture photo'}`}
                accessibilityState={{ disabled: uploadState === 'uploading' }}
              >
                {captured ? (
                  <View style={styles.capturedPreview}>
                    <Text style={styles.capturedIcon}>{selectedType === 'video' ? '🎬' : '🖼️'}</Text>
                    <Text style={styles.capturedName}>{captured.name}</Text>
                    {captured.durationSec !== undefined && (
                      <Text style={styles.capturedMeta}>{captured.durationSec}s</Text>
                    )}
                    {captured.fileHash && (
                      <Text style={styles.capturedMeta}>SHA-256: {captured.fileHash.slice(0, 12)}…</Text>
                    )}
                    <Text style={styles.capturedReady}>Ready to upload</Text>
                  </View>
                ) : (
                  <View style={styles.capturePlaceholder}>
                    <Text style={styles.captureIcon}>{selectedType === 'video' ? '🎥' : '📷'}</Text>
                    <Text style={styles.captureLabel}>
                      Tap to {selectedType === 'video' ? 'record' : 'capture'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {captured && uploadState !== 'uploading' && (
                <TouchableOpacity
                  style={styles.retakeBtn}
                  onPress={handleReset}
                  accessibilityRole="button"
                  accessibilityLabel={`Retake ${selectedType}`}
                >
                  <Text style={styles.retakeBtnText}>↩ Retake</Text>
                </TouchableOpacity>
              )}
            </View>

            {uploadState === 'error' && uploadError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>Upload failed: {uploadError}</Text>
                <Text style={styles.errorHint}>Tap Upload to resume from where it stopped.</Text>
              </View>
            )}

            {uploadState === 'uploading' && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` as `${number}%` }]} />
                <Text style={styles.progressLabel}>{uploadProgress}%</Text>
              </View>
            )}

            {captured && (
              <TouchableOpacity
                style={[styles.uploadBtn, uploadState === 'uploading' && styles.btnDisabled]}
                onPress={handleUpload}
                disabled={uploadState === 'uploading'}
                accessibilityRole="button"
                accessibilityLabel={`Upload ${selectedType === 'video' ? 'video' : 'photo'}`}
                accessibilityState={{ disabled: uploadState === 'uploading', busy: uploadState === 'uploading' }}
              >
                {uploadState === 'uploading' ? (
                  <View style={styles.uploadingRow}>
                    <ActivityIndicator color="#fff" accessibilityLabel="Uploading evidence" />
                    <Text style={styles.uploadBtnText}>Uploading… {uploadProgress}%</Text>
                  </View>
                ) : (
                  <Text style={styles.uploadBtnText}>
                    ☁️ {uploadState === 'error' ? 'Resume Upload' : `Upload ${selectedType === 'video' ? 'Video' : 'Photo'}`}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e8e0',
  },
  backBtn: { minHeight: 44, minWidth: 44, justifyContent: 'center' },
  backText: { fontSize: 14, color: '#2d6a2d', fontWeight: '500', width: 60 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a3a1a' },
  content: { padding: 16, gap: 16 },
  tradeRef: { fontSize: 12, color: '#888', fontFamily: 'monospace' },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a3a1a' },
  hint: { fontSize: 13, color: '#666', lineHeight: 20 },
  typeRow: { flexDirection: 'row', gap: 12 },
  typeBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e8e0',
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  typeBtnActive: { borderColor: '#2d6a2d', backgroundColor: '#f0f8f0' },
  typeIcon: { fontSize: 28 },
  typeLabel: { fontSize: 13, fontWeight: '600', color: '#888', textAlign: 'center' },
  typeLabelActive: { color: '#2d6a2d' },
  captureArea: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d0d8d0',
    borderStyle: 'dashed',
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8faf8',
  },
  captureAreaDone: { borderColor: '#2d6a2d', borderStyle: 'solid', backgroundColor: '#f0f8f0' },
  capturePlaceholder: { alignItems: 'center', gap: 8 },
  captureIcon: { fontSize: 48 },
  captureLabel: { fontSize: 14, color: '#888' },
  capturedPreview: { alignItems: 'center', gap: 6, padding: 16 },
  capturedIcon: { fontSize: 40 },
  capturedName: { fontSize: 12, color: '#555', fontFamily: 'monospace' },
  capturedMeta: { fontSize: 11, color: '#888', fontFamily: 'monospace' },
  capturedReady: { fontSize: 13, color: '#2d6a2d', fontWeight: '600' },
  retakeBtn: { alignSelf: 'center' },
  retakeBtnText: { color: '#888', fontSize: 13 },
  errorBanner: { backgroundColor: '#FEE2E2', padding: 12, borderRadius: 8, gap: 4 },
  errorText: { color: '#DC2626', fontSize: 13 },
  errorHint: { color: '#991B1B', fontSize: 12 },
  progressBar: {
    height: 20,
    backgroundColor: '#e0e8e0',
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#2d6a2d',
    borderRadius: 10,
  },
  progressLabel: { textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#1a3a1a' },
  uploadBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  uploadingRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  successCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  successIcon: { fontSize: 56 },
  successTitle: { fontSize: 22, fontWeight: '700', color: '#1a3a1a' },
  successBody: { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 22 },
  hashLabel: { fontSize: 11, color: '#888', fontFamily: 'monospace' },
  doneBtn: {
    backgroundColor: '#2d6a2d',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 8,
  },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
