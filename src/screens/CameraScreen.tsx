import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';

// ─── Screen ───────────────────────────────────────────────────────────────────

/**
 * CameraScreen — immediately opens the native camera on mount.
 * On success: navigates to UploadScreen with the captured imageUri.
 * On cancel/error: goes back to the previous screen.
 */
const CameraScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();

  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
        includeBase64: false,
      });

      if (result.didCancel) {
        navigation.goBack();
        return;
      }

      if (result.errorCode) {
        console.error('Camera error:', result.errorCode, result.errorMessage);
        navigation.goBack();
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri) {
          navigation.navigate('Upload', { imageUri: asset.uri });
        } else {
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Unexpected camera error:', error);
      navigation.goBack();
    }
  };

  useEffect(() => {
    takePhoto();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[Typography.bodyMedium, styles.label, { color: colors.textSecondary }]}>
        Opening camera…
      </Text>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  label: {
    marginTop: 4,
  },
});

export default CameraScreen;
