import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
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
} from '../../theme/tokens';

const EMBLEM_SOURCE = require('../../../assets/beerdex-emblem.png');

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async () => {
    setErrorMsg(null);
    if (!email.trim() || !username.trim() || !password) {
      setErrorMsg('Completa todos los campos para registrarte.');
      return;
    }

    setSubmitting(true);
    try {
      await register(email.trim(), username.trim(), password);
      router.replace('/menu');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo completar el registro.');
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
        <View style={styles.header}>
          <View style={[styles.emblem, SHADOWS.amberGlow]}>
            <Image source={EMBLEM_SOURCE} style={styles.emblemImg} resizeMode="cover" />
          </View>
          <Text style={styles.brandTitle}>BeerDex</Text>
          <Text style={styles.sub}>Crea tu cuenta de coleccionista</Text>
        </View>

        <LinearGradient
          colors={GRADIENTS.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, SHADOWS.card]}
        >
          <Text style={styles.cardTitle}>Registro</Text>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nombre de usuario</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="Ej: MaestroLupulo"
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
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry
              onSubmitEditing={handleRegister}
              style={styles.input}
            />
          </View>

          <Pressable onPress={handleRegister} disabled={submitting} style={styles.submitWrap}>
            <LinearGradient
              colors={GRADIENTS.amberBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.primaryBtn, SHADOWS.amberGlow, submitting && styles.btnDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.bg} />
              ) : (
                <Text style={styles.primaryBtnText}>Crear cuenta y empezar</Text>
              )}
            </LinearGradient>
          </Pressable>
        </LinearGradient>

        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>¿Ya tienes cuenta?</Text>
          <Link href="/auth/login" asChild>
            <Pressable>
              <Text style={styles.footerLink}>Iniciar sesión</Text>
            </Pressable>
          </Link>
        </View>
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
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emblem: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#0B0807',
    borderWidth: 2,
    borderColor: COLORS.borderGold,
    overflow: 'hidden',
    marginBottom: SPACING.sm + 2,
  },
  emblemImg: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    color: COLORS.amberBright,
    fontFamily: FONTS.brand,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sub: {
    color: COLORS.textSecondary,
    fontSize: 14,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
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
});
