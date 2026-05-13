import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getServerUrl } from '../utils/storage';
import { uploadImage } from '../services/UploadService';
import { LightColors } from '../theme/colors';

const UploadScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { imageUri } = route.params;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = async () => {
    const baseUrl = await getServerUrl();
    if (!baseUrl) {
      Alert.alert('Not Connected', 'Please connect to your PC server first.', [
        { text: 'Go to Connection', onPress: () => navigation.navigate('Connection') },
      ]);
      return;
    }

    setIsUploading(true);
    try {
      await uploadImage(baseUrl, imageUri, (progress) => {
        setUploadProgress(progress);
      });
      Alert.alert('Success', 'Document uploaded to PC successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } catch (error) {
      Alert.alert('Upload Failed', 'Failed to send document to PC. Check your connection.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Preview Document</Text>
      
      <View style={styles.previewContainer}>
        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
      </View>

      {isUploading ? (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color={LightColors.primary} />
          <Text style={styles.progressText}>Uploading: {uploadProgress}%</Text>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarForeground, { width: `${uploadProgress}%` }]} />
          </View>
        </View>
      ) : (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.retakeButton]}
            onPress={() => navigation.navigate('Camera')}
          >
            <Text style={styles.buttonText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.uploadButton]}
            onPress={handleUpload}
          >
            <Text style={styles.buttonText}>Send to PC</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 0.48,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#666',
  },
  uploadButton: {
    backgroundColor: LightColors.primary,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'center',
    padding: 20,
  },
  progressText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  progressBarBackground: {
    width: '100%',
    height: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
    marginTop: 15,
    overflow: 'hidden',
  },
  progressBarForeground: {
    height: '100%',
    backgroundColor: LightColors.primary,
  },
});

export default UploadScreen;
