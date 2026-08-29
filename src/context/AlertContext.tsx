// custom themed alert and confirmation dialog provider

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { useAppTheme } from './ThemeContext';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface AlertConfig {
  title: string;
  message?: string;
  icon?: string;
  buttons?: AlertButton[];
  cancelable?: boolean;
}

interface AlertContextValue {
  showAlert: (config: AlertConfig) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    options?: {
      confirmText?: string;
      cancelText?: string;
      isDestructive?: boolean;
      icon?: string;
    }
  ) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const hideAlert = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setConfig(null);
    }, 200);
  }, []);

  const showAlert = useCallback((newConfig: AlertConfig) => {
    setConfig(newConfig);
    setVisible(true);
  }, []);

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void | Promise<void>,
      options?: {
        confirmText?: string;
        cancelText?: string;
        isDestructive?: boolean;
        icon?: string;
      }
    ) => {
      const isDestructive = options?.isDestructive ?? false;
      const confirmText = options?.confirmText ?? (isDestructive ? 'Delete' : 'Confirm');
      const cancelText = options?.cancelText ?? 'Cancel';
      const icon = options?.icon ?? (isDestructive ? '🗑️' : '⚠️');

      showAlert({
        title,
        message,
        icon,
        buttons: [
          {
            text: cancelText,
            style: 'cancel',
          },
          {
            text: confirmText,
            style: isDestructive ? 'destructive' : 'default',
            onPress: onConfirm,
          },
        ],
      });
    },
    [showAlert]
  );

  const handleButtonPress = async (btn: AlertButton) => {
    hideAlert();
    if (btn.onPress) {
      try {
        await btn.onPress();
      } catch (err) {
        console.error('error executing alert button action:', err);
      }
    }
  };

  // default to an OK button if no buttons specified
  const buttons: AlertButton[] =
    config?.buttons && config.buttons.length > 0
      ? config.buttons
      : [{ text: 'OK', style: 'default' }];

  // resolve default icon based on title/style if none provided
  const resolveIcon = () => {
    if (config?.icon) return config.icon;
    const lower = (config?.title || '').toLowerCase();
    if (lower.includes('delete') || lower.includes('wipe') || lower.includes('clear')) return '🗑️';
    if (lower.includes('discard') || lower.includes('cancel') || lower.includes('error') || lower.includes('failed')) return '⚠️';
    if (lower.includes('success') || lower.includes('complete') || lower.includes('saved')) return '✅';
    if (lower.includes('import')) return '📥';
    if (lower.includes('export')) return '📤';
    return '💡';
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}
      {config && (
        <Modal
          visible={visible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (config.cancelable !== false) {
              hideAlert();
            }
          }}
        >
          <TouchableWithoutFeedback
            onPress={() => {
              if (config.cancelable !== false) {
                hideAlert();
              }
            }}
          >
            <View style={styles.backdrop}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View
                  style={[
                    styles.alertCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* icon badge */}
                  <View
                    style={[
                      styles.iconCircle,
                      {
                        backgroundColor: colors.cardAlt,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.iconEmoji}>{resolveIcon()}</Text>
                  </View>

                  {/* title */}
                  <Text style={[styles.title, { color: colors.text }]}>
                    {config.title}
                  </Text>

                  {/* message body */}
                  {config.message ? (
                    <ScrollView style={styles.messageScroll} bounces={false}>
                      <Text style={[styles.message, { color: colors.textMuted }]}>
                        {config.message}
                      </Text>
                    </ScrollView>
                  ) : null}

                  {/* action buttons */}
                  <View
                    style={[
                      styles.buttonContainer,
                      buttons.length > 2 ? styles.buttonContainerVertical : styles.buttonContainerHorizontal,
                    ]}
                  >
                    {buttons.map((btn, idx) => {
                      const isDestructive = btn.style === 'destructive';
                      const isCancel = btn.style === 'cancel';

                      let btnBg = colors.primary;
                      let btnTextColor = colors.primaryText;
                      let btnBorderColor = 'transparent';

                      if (isDestructive) {
                        btnBg = colors.danger;
                        btnTextColor = '#FFFFFF';
                      } else if (isCancel) {
                        btnBg = colors.cardAlt;
                        btnTextColor = colors.text;
                        btnBorderColor = colors.border;
                      }

                      return (
                        <TouchableOpacity
                          key={`alert_btn_${idx}`}
                          style={[
                            styles.btn,
                            buttons.length <= 2 && styles.btnFlex,
                            {
                              backgroundColor: btnBg,
                              borderColor: btnBorderColor,
                              borderWidth: isCancel ? 1 : 0,
                            },
                          ]}
                          onPress={() => handleButtonPress(btn)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.btnText,
                              { color: btnTextColor },
                              isDestructive && { fontWeight: '900' },
                            ]}
                          >
                            {btn.text}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </AlertContext.Provider>
  );
}

export function useAppAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error('useAppAlert must be used within an AlertProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconEmoji: {
    fontSize: 26,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  messageScroll: {
    maxHeight: 220,
    width: '100%',
    marginBottom: 18,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
  },
  buttonContainerVertical: {
    flexDirection: 'column',
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnFlex: {
    flex: 1,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
