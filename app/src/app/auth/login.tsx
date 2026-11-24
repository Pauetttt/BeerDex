import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import {
  COLORS,
  FONTS,
  GRADIENTS,
  RADIUS,
  SHADOWS,
  SPACING,
  WEB_GLASS,
} from '../../theme/tokens';

const EMBLEM_SOURCE = require('../../../assets/beerdex-emblem.png');

export default function LoginScreen() {
  const router = useRouter();
  const { login, ageVerified, confirmAge, loading } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [underAgeBlocked, setUnderAgeBlocked] = useState(false);

  const handleLogin = async () => {
    setErrorMsg(null);
    if (!username.trim() || !password) {
      setErrorMsg('Introduce tu nombre de usuario y contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      await login(username.trim(), password);
      router.replace('/menu');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al iniciar sesión.');
    } finally {
      setSubmitting(false);
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
        <View style={styles.hero}>
          <View style={[styles.emblem, SHADOWS.amberGlow]}>
            <Image source={EMBLEM_SOURCE} style={styles.emblemImg} resizeMode="cover" />
          </View>
          <Text style={styles.brandTitle}>BeerDex</Text>
          <Text style={styles.brandSub}>
            Escanea, colecciona y presume tu catálogo cervecero
          </Text>
        </View>

        <LinearGradient
          colors={GRADIENTS.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, SHADOWS.card]}
        >
          <Text style={styles.cardTitle}>Ya tengo cuenta</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Nombre de usuario</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Ej: CerveceroPro"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              onSubmitEditing={handleLogin}
              style={styles.input}
            />
          </View>

          <Pressable onPress={handleLogin} disabled={submitting} style={styles.submitWrap}>
            <LinearGradient
              colors={GRADIENTS.amberBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.primaryBtn, SHADOWS.amberGlow, submitting && styles.btnDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.bg} />
              ) : (
                <Text style={styles.primaryBtnText}>Iniciar sesión</Text>
              )}
            </LinearGradient>
          </Pressable>

          <Link href="/auth/forgot-password" asChild>
            <Pressable style={styles.linkBtn}>
              <Text style={styles.linkText}>
                ¿Olvidaste tu usuario o contraseña?
              </Text>
            </Pressable>
          </Link>
        </LinearGradient>

        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>¿Nuevo en BeerDex?</Text>
          <Link href="/auth/register" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Crear cuenta</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>

      {/* Modal de Verificación +18 en primera apertura */}
      <Modal
        visible={!loading && !ageVerified}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <LinearGradient
            colors={GRADIENTS.hero}
            style={[styles.modalCard, SHADOWS.card]}
          >
            <View style={[styles.agePill, SHADOWS.amberGlow]}>
              <Text style={styles.agePillText}>+18</Text>
            </View>
            <Text style={styles.modalTitle}>Verificación de mayoría de edad</Text>
            <Text style={styles.modalBody}>
              BeerDex contiene referencias a bebidas alcohólicas. Confirma que tienes la edad legal mínima (18 años) para acceder y disfruta con responsabilidad.
            </Text>

            {underAgeBlocked ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  Lo sentimos, debes ser mayor de 18 años para acceder a BeerDex.
                </Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setUnderAgeBlocked(true)}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>Soy menor de 18</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  setUnderAgeBlocked(false);
                  await confirmAge();
                }}
                style={styles.confirmAgeFlex}
              >
                <LinearGradient
                  colors={GRADIENTS.amberBtn}
                  style={styles.confirmAgeBtn}
                >
                  <Text style={styles.primaryBtnText}>Sí, tengo +18 años</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </Modal>
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
  hero: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emblem: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#0B0807',
    borderWidth: 2,
    borderColor: COLORS.borderGold,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  emblemImg: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    color: COLORS.amberBright,
    fontFamily: FONTS.brand,
    fontSize: 42,
    fontWeight: '400',
    letterSpacing: 0.6,
  },
  brandSub: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    borderRadius: RADIUS.xl + 4,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  cardTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 4,
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
  submitWrap: {
    marginTop: SPACING.sm,
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
  linkBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  linkText: {
    color: COLORS.amberBright,
    fontSize: 13,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.xl,
  },
  footerLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: COLORS.amberBright,
    fontSize: 14,
    fontWeight: '800',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 6, 4, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    ...WEB_GLASS,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.xl + 4,
    borderWidth: 1.5,
    borderColor: COLORS.borderGold,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  agePill: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.amberBg,
    borderWidth: 2,
    borderColor: COLORS.amberBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agePillText: {
    color: COLORS.amberBright,
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: '900',
  },
  modalTitle: {
    color: COLORS.text,
    fontFamily: FONTS.display,
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalBody: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
    marginTop: SPACING.sm,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: COLORS.elevated,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  confirmAgeFlex: {
    flex: 1.35,
  },
  confirmAgeBtn: {
    borderRadius: RADIUS.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
});
