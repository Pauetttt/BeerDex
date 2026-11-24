import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAppAlert } from '../../context/AlertContext';
import { authApi } from '../../services/api';
import {
  COLORS,
  FONTS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
} from '../../theme/tokens';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { showAlert } = useAppAlert();

  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devHint, setDevHint] = useState<{ code: string; username?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRequestCode = async () => {
    setErrorMsg(null);
    if (!email.trim()) {
      setErrorMsg('Introduce el correo asociado a tu cuenta.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email.trim());
      if (res.devResetCode) {
        setDevHint({ code: res.devResetCode, username: res.devUsername });
      }
      setStep('reset');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo enviar el correo.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setErrorMsg(null);
    if (!token.trim() || !newPassword) {
      setErrorMsg('Introduce el código de recuperación y la nueva contraseña.');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        token: token.trim(),
        newPassword,
      });
      showAlert('Contraseña restablecida', res.message);
      router.replace('/auth/login');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Código inválido o expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient
          colors={GRADIENTS.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, SHADOWS.card]}
        >
          <Text style={styles.title}>Recuperar acceso</Text>
          <Text style={styles.desc}>
            {step === 'email'
              ? 'Introduce tu correo electrónico. Te enviaremos tu nombre de usuario y un código para restablecer tu contraseña.'
              : 'Revisa tu correo e introduce el código de 6 caracteres junto con tu nueva contraseña.'}
          </Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {devHint ? (
            <View style={styles.devBox}>
              <Text style={styles.devTitle}>Modo desarrollo local (sin Resend):</Text>
              {devHint.username ? (
                <Text style={styles.devText}>Usuario: {devHint.username}</Text>
              ) : null}
              <Text style={styles.devText}>Código de recuperación: {devHint.code}</Text>
            </View>
          ) : null}

          {step === 'email' ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Correo electrónico</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="tu@correo.com"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </View>

              <Pressable onPress={handleRequestCode} disabled={loading}>
                <LinearGradient
                  colors={GRADIENTS.amberBtn}
                  style={[styles.primaryBtn, SHADOWS.amberGlow, loading && styles.btnDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.bg} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Enviar código</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Código de recuperación</Text>
                <TextInput
                  value={token}
                  onChangeText={setToken}
                  placeholder="Ej: A7K9P2"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                  style={styles.input}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Nueva contraseña</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry
                  style={styles.input}
                />
              </View>

              <Pressable onPress={handleReset} disabled={loading}>
                <LinearGradient
                  colors={GRADIENTS.amberBtn}
                  style={[styles.primaryBtn, SHADOWS.amberGlow, loading && styles.btnDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.bg} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Restablecer contraseña</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </>
          )}

          <Link href="/auth/login" asChild>
            <Pressable style={styles.backBtn}>
              <Text style={styles.backText}>Volver a iniciar sesión</Text>
            </Pressable>
          </Link>
        </LinearGradient>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.xl,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: RADIUS.xl + 4,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  title: {
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontSize: 23,
    fontWeight: '800',
  },
  desc: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(12, 9, 8, 0.72)',
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  primaryBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontFamily: FONTS.display,
    fontSize: 15.5,
    fontWeight: '900',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backText: {
    color: COLORS.amberBright,
    fontSize: 14,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: COLORS.dangerBg,
    borderWidth: 1,
    borderColor: COLORS.dangerBorder,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  errorText: {
    color: '#FFB4B0',
    fontSize: 13,
    fontWeight: '600',
  },
  devBox: {
    backgroundColor: COLORS.amberBg,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 4,
  },
  devTitle: {
    color: COLORS.amberBright,
    fontSize: 12,
    fontWeight: '800',
  },
  devText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
});
