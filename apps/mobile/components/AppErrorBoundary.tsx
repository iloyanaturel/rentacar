import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { logger } from '@/utils/logger';
import { colors, spacing, typography } from '@/theme';

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Production error boundary — prevents blank white crash screens.
 * Wire Sentry.captureException here when DSN is configured.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ui.unhandled', {
      message: error.message,
      componentStack: info.componentStack?.slice(0, 500),
    });
    // TODO: Sentry.captureException(error) when EXPO_PUBLIC_SENTRY_DSN is set
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Bir sorun oluştu</Text>
          <Text style={styles.body}>
            Uygulama beklenmeyen bir hatayla karşılaştı. Lütfen yeniden deneyin.
          </Text>
          <Pressable
            style={styles.btn}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.btnText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: { ...typography.title, color: colors.text, textAlign: 'center' },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  btn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  btnText: { ...typography.label, color: colors.textInverse },
});
