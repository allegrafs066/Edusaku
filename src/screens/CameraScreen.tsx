import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { LightColors } from '../theme/colors';

const CameraScreen = () => {
  const navigation = useNavigation<any>();

  const takePhoto = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      saveToPhotos: false,
    });

    if (result.didCancel) {
      navigation.goBack();
    } else if (result.errorCode) {
      console.error('Camera Error: ', result.errorMessage);
      navigation.goBack();
    } else if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      navigation.navigate('Upload', { imageUri: asset.uri });
    }
  };

  useEffect(() => {
    takePhoto();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={LightColors.primary} />
      <Text style={styles.text}>Opening Camera...</Text>
    </View>
  );
};

import { ActivityIndicator } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
});

export default CameraScreen;
