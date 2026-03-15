let Haptics: typeof import('expo-haptics') | null = null;

try {
  Haptics = require('expo-haptics');
} catch {
  Haptics = null;
}

export async function impactLight() {
  try { await Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Light); } catch {}
}

export async function impactMedium() {
  try { await Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium); } catch {}
}

export async function notifySuccess() {
  try { await Haptics?.notificationAsync?.(Haptics.NotificationFeedbackType.Success); } catch {}
}
