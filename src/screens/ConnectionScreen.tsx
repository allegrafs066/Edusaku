import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraScreen } from 'react-native-camera-kit';
import { useNavigation } from '@react-navigation/native';
import { saveServerUrl, getServerUrl } from '../utils/storage';
import { pingServer } from '../services/NetworkService';
import { LightColors } from '../theme/colors';

const ConnectionScreen = () => {
  const navigation = useNavigation<any>();
  const [ipAddress, setIpAddress] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);

  useEffect(() => {
    loadSavedUrl();
  }, []);

  const loadSavedUrl = async () => {
    const url = await getServerUrl();
    if (url) {
      setSavedUrl(url);
      setIpAddress(url.replace('http://', '').split(':')[0]);
    }
  };

  const handleConnect = async (url: string) => {
    setIsConnecting(true);
    try {
      const data = await pingServer(url);
      await saveServerUrl(url);
      Alert.alert('Connected', `Successfully connected to ${data.message}`);
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Connection Failed', 'Could not connect to the server. Make sure you are on the same network.');
    } finally {
      setIsConnecting(false);
      setIsScanning(false);
    }
  };

  const onReadCode = (event: any) => {
    const url = event.nativeEvent.codeStringValue;
    if (url.startsWith('http://')) {
      handleConnect(url);
    } else {
      Alert.alert('Invalid QR Code', 'The scanned code is not a valid Edusaku server URL.');
    }
  };

  if (isScanning) {
    return (
      <View style={styles.container}>
        <CameraScreen
          showFrame={true}
          scanBarcode={true}
          onReadCode={onReadCode}
          frameColor="white"
          colorForScannerFrame="black"
        />
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => setIsScanning(false)}
        >
          <Text style={styles.buttonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connect to PC</Text>
      <Text style={styles.subtitle}>
        Scan the QR code on your PC server or enter the IP address manually.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Server IP Address</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 192.168.1.5"
          value={ipAddress}
          onChangeText={setIpAddress}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => handleConnect(`http://${ipAddress}:3000`)}
        disabled={isConnecting || !ipAddress}
      >
        {isConnecting ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.buttonText}>Connect Manually</Text>
        )}
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.line} />
      </View>

      <TouchableOpacity
        style={[styles.button, styles.qrButton]}
        onPress={() => setIsScanning(true)}
      >
        <Text style={styles.buttonText}>Scan QR Code</Text>
      </TouchableOpacity>

      {savedUrl && (
        <Text style={styles.statusText}>
          Last connected: {savedUrl}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: LightColors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  qrButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 30,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999',
  },
  statusText: {
    marginTop: 20,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});

export default ConnectionScreen;
