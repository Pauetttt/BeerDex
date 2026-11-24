import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING, WEB_GLASS } from '../theme/tokens';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface AlertState {
  title: string;
  message: string;
  buttons: AlertButton[];
}

interface AlertContextValue {
  showAlert: (title: string, message: string, buttonText?: string) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: { confirmText?: string; cancelText?: string; destructive?: boolean }
  ) => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertState | null>(null);

  const showAlert = useCallback(
    (title: string, message: string, buttonText = 'Entendido') => {
      setState({
        title,
        message,
        buttons: [{ text: buttonText, style: 'default' }],
      });
    },
    []
  );

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      options?: { confirmText?: string; cancelText?: string; destructive?: boolean }
    ) => {
      setState({
        title,
        message,
        buttons: [
          { text: options?.cancelText || 'Cancelar', style: 'cancel' },
          {
            text: options?.confirmText || 'Confirmar',
            style: options?.destructive ? 'destructive' : 'default',
            onPress: onConfirm,
          },
        ],
      });
    },
    []
  );

  const handlePress = (btn: AlertButton) => {
    setState(null);
    btn.onPress?.();
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <Modal
        visible={Boolean(state)}
        transparent
        animationType="fade"
        onRequestClose={() => setState(null)}
      >
        <View style={styles.backdrop}>
          <View style={[styles.card, SHADOWS.card]}>
            <Text style={styles.title}>{state?.title}</Text>
            <Text style={styles.message}>{state?.message}</Text>
            <View style={styles.actions}>
              {state?.buttons.map((btn, idx) => {
                const isCancel = btn.style === 'cancel';
                const isDestructive = btn.style === 'destructive';
                return (
                  <Pressable
                    key={`${btn.text}-${idx}`}
                    onPress={() => handlePress(btn)}
                    style={[
                      styles.btn,
                      isCancel && styles.btnCancel,
                      isDestructive && styles.btnDestructive,
                      !isCancel && !isDestructive && styles.btnPrimary,
                    ]}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        isCancel && styles.btnCancelText,
                        isDestructive && styles.btnDestructiveText,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useAppAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAppAlert debe usarse dentro de AlertProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 6, 4, 0.84)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    ...WEB_GLASS,
  },
  card: {
    width: '100%',
    maxWidth: 390,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl + 2,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    padding: SPACING.xl,
  },
  title: {
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  btn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: RADIUS.md,
    minWidth: 96,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.amber,
  },
  btnCancel: {
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
  },
  btnDestructive: {
    backgroundColor: COLORS.danger,
  },
  btnText: {
    color: COLORS.bg,
    fontWeight: '800',
    fontSize: 14,
  },
  btnCancelText: {
    color: COLORS.textSecondary,
  },
  btnDestructiveText: {
    color: '#FFFFFF',
  },
});
