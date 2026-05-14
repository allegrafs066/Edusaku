import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Camera } from 'react-native-camera-kit';
import { useNavigation } from '@react-navigation/native';
import { saveServerUrl, getServerUrl } from '../utils/storage';
import { pingServer } from '../services/NetworkService';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';

// ─── Screen ───────────────────────────────────────────────────────────────────

const ConnectionScreen = () => {
  const navigation = useNavigation<any>();
  const colors = useColors();

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
      // Pre-fill IP field from saved URL
      setIpAddress(url.replace('http://', '').split(':')[0]);
    }
  };

  const handleConnect = async (url: string) => {
    setIsConnecting(true);
    try {
      const data = await pingServer(url);
      await saveServerUrl(url);
      Alert.alert('Connected ✓', `Connected to ${data.message}`, [
        { text: 'OK', onPress: () => navigation.navigate('Home') },
      ]);
    } catch {
      Alert.alert(
        'Connection Failed',
        'Could not reach the server. Make sure your phone and PC are on the same WiFi network.',
      );
    } finally {
      setIsConnecting(false);
      setIsScanning(false);
    }
  };

  const onReadCode = (event: any) => {
    const url: string = event.nativeEvent.codeStringValue;
    if (url.startsWith('http://')) {
      handleConnect(url);
    } else {
      Alert.alert('Invalid QR Code', 'This QR code is not an Edusaku server URL.');
    }
  };

  // ── QR Scanner view ────────────────────────────────────────────────────────

  if (isScanning) {
    return (
      <View style={styles.scannerContainer}>
        <Camera
          style={StyleSheet.absoluteFill}
          scanBarcode
          onReadCode={onReadCode}
          showFrame
          frameColor="white"
          laserColor="transparent"
        />
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: colors.overlay }]}
          onPress={() => setIsScanning(false)}
        >
          <Text style={[Typography.labelMedium, { color: '#FFFFFF' }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.inner}>
        {/* Header text */}
        <Text style={[Typography.heading3, styles.title, { color: colors.textPrimary }]}>
          Connect to PC
        </Text>
        <Text style={[Typography.bodySmall, styles.subtitle, { color: colors.textSecondary }]}>
          Scan the QR code shown on your PC, or enter the IP address manually.
        </Text>

        {/* IP input */}
        <View style={styles.inputGroup}>
          <Text style={[Typography.labelSmall, styles.label, { color: colors.textSecondary }]}>
            SERVER IP ADDRESS
          </Text>
          <TextInput
            style={[
              Typography.bodyMedium,
              styles.input,
              {
                color: colors.textPrimary,
                backgroundColor: colors.inputBackground,
                borderColor: colors.border,
              },
            ]}
            placeholder="e.g. 192.168.1.5"
            placeholderTextColor={colors.textSecondary}
            value={ipAddress}
            onChangeText={setIpAddress}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={() => {
              if (ipAddress) handleConnect(`http://${ipAddress}:3000`);
            }}
          />
        </View>

        {/* Connect button */}
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: ipAddress && !isConnecting ? colors.primary : colors.border },
          ]}
          onPress={() => handleConnect(`http://${ipAddress}:3000`)}
          disabled={isConnecting || !ipAddress}
          accessibilityRole="button"
          accessibilityLabel="Connect to server"
        >
          {isConnecting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={[Typography.labelMedium, { color: '#FFFFFF' }]}>Connect</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[Typography.caption, styles.dividerText, { color: colors.textSecondary }]}>
            OR
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        {/* QR scan button */}
        <TouchableOpacity
          style={[styles.button, styles.qrButton, { borderColor: colors.primary }]}
          onPress={() => setIsScanning(true)}
          accessibilityRole="button"
          accessibilityLabel="Scan QR code"
        >
          <Text style={[Typography.labelMedium, { color: colors.primary }]}>
            📷  Scan QR Code
          </Text>
        </TouchableOpacity>

        {/* Last connected */}
        {savedUrl && (
          <Text style={[Typography.caption, styles.savedUrl, { color: colors.textSecondary }]}>
            Last connected: {savedUrl}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  qrButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    marginHorizontal: 12,
  },
  savedUrl: {
    marginTop: 24,
    textAlign: 'center',
  },
  // QR scanner
  scannerContainer: {
    flex: 1,
  },
  cancelButton: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
  },
});

export default ConnectionScreen;
