import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useColors } from '../theme/colors';
import { Typography } from '../theme/typography';
import { useAppStore } from '../store/appStore';
import DocumentCard from '../components/DocumentCard';
import PDFUploader from '../components/PDFUploader';
import { getSessionDisplayTitle } from '../services/titleGenerator';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }: Props) {
  const colors = useColors();
  const { documents, setActiveDocument, isUploadingPDF, sessions } = useAppStore();

  // ── Header ──────────────────────────────────────────────────────────────────

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Connection')}
          style={styles.headerButton}
        >
          <Text style={[styles.headerButtonText, { color: colors.primary }]}>Connect PC</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, colors]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleUploadPress() {
    // Backend engineer wires real file-picker logic here via the store / service layer.
    // For now, show a placeholder alert so the FAB is visibly interactive.
    Alert.alert(
      'Upload PDF',
      'PDF picker will be implemented by the backend engineer.',
      [{ text: 'OK' }],
    );
  }

  function handleDocumentPress(documentId: string) {
    setActiveDocument(documentId);
    navigation.navigate('Chat', { documentId });
  }

  function handleDocumentLongPress(documentId: string, title: string) {
    Alert.alert(
      title,
      'What would you like to do?',
      [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => useAppStore.getState().removeDocument(documentId),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {documents.length === 0 ? (
        // ── Empty state ──────────────────────────────────────────────────────
        <View style={styles.emptyState}>
          {/* Illustration placeholder */}
          <View style={[styles.emptyIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.emptyIconText}>📄</Text>
          </View>

          <Text style={[Typography.titleMedium, styles.emptyTitle, { color: colors.textPrimary }]}>
            No documents yet
          </Text>
          <Text style={[Typography.bodySmall, styles.emptySubtitle, { color: colors.textSecondary }]}>
            Tap the + button to upload your first PDF.{'\n'}
            Everything stays on your device.
          </Text>
        </View>
      ) : (
        // ── Document list ────────────────────────────────────────────────────
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          // Extra bottom padding so last card isn't hidden behind FAB
          ListFooterComponent={<View style={styles.listFooter} />}
          renderItem={({ item }) => (
            <DocumentCard
              document={item}
              sessionTitle={
                sessions[item.id]
                  ? getSessionDisplayTitle(sessions[item.id], item.title)
                  : undefined
              }
              onPress={() => handleDocumentPress(item.id)}
              onLongPress={() => handleDocumentLongPress(item.id, item.title)}
            />
          )}
        />
      )}

      {/* Floating action buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.cameraFab, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('Camera')}
        >
          <Text style={styles.fabIcon}>📷</Text>
        </TouchableOpacity>
        
        <PDFUploader
          onPress={handleUploadPress}
          loading={isUploadingPDF}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    marginRight: 8,
  },
  headerButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIconText: {
    fontSize: 36,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  // List
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  listFooter: {
    height: 96, // clears the FAB (56 + 28 bottom + buffer)
  },
  fabContainer: {
    position: 'absolute',
    bottom: 28,
    right: 28,
    flexDirection: 'column',
    gap: 16,
    alignItems: 'center',
  },
  cameraFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 24,
  },
});
