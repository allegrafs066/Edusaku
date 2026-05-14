import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getServerUrl } from '../utils/storage';
import { uploadImage } from '../services/UploadService';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';
import ProgressBar from '../components/ProgressBar';

// ─── Screen ───────────────────────────────────────────────────────────────────

const UploadScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const colors = useColors();

  const { imageUri } = route.params as { imageUri: string };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async () => {
    const baseUrl = await getServerUrl();
    if (!baseUrl) {
      Alert.alert(
        'Not Connected',
        'Connect to your PC server first.',
        [
          { text: 'Go to Connection', onPress: () => navigation.navigate('Connection') },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await uploadImage(baseUrl, imageUri, (progress) => {
        setUploadProgress(progress / 100); // ProgressBar expects 0–1
      });
      Alert.alert('Sent ✓', 'Document uploaded to your PC successfully.', [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } catch {
      Alert.alert('Upload Failed', 'Could not send the document. Check your connection and try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Title */}
      <Text style={[Typography.heading3, styles.title, { color: colors.textPrimary }]}>
        Preview Document
      </Text>

      {/* Image preview */}
      <View style={[styles.previewContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
      </View>

      {/* Upload progress */}
      {isUploading && (
        <View style={styles.progressSection}>
          <ProgressBar progress={uploadProgress} height={6} />
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[Typography.caption, { color: colors.textSecondary }]}>
              Sending to PC… {Math.round(uploadProgress * 100)}%
            </Text>
          </View>
        </View>
      )}

      {/* Action buttons */}
      {!isUploading && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.retakeButton, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('Camera')}
            accessibilityRole="button"
            accessibilityLabel="Retake photo"
          >
            <Text style={[Typography.labelMedium, { color: colors.textPrimary }]}>
              Retake
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.uploadButton, { backgroundColor: colors.primary }]}
            onPress={handleUpload}
            accessibilityRole="button"
            accessibilityLabel="Send document to PC"
          >
            <Text style={[Typography.labelMedium, { color: '#FFFFFF' }]}>
              Send to PC
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  previewContainer: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  progressSection: {
    marginBottom: 20,
    gap: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  retakeButton: {
    borderWidth: 1.5,
  },
  uploadButton: {},
});

export default UploadScreen;
