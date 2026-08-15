/**
 * Expo Notifications helpers.
 * Permission is never requested on cold start — only via settings / onboarding.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export type PushPermissionResult = {
  status: 'granted' | 'denied' | 'undetermined' | 'unavailable';
  token: string | null;
};

async function loadNotifications() {
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

export async function getPushPermissionStatus(): Promise<string> {
  const Notifications = await loadNotifications();
  if (!Notifications) return 'unavailable';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'unavailable';
  }
}

export async function ensurePushPermissionsAndToken(): Promise<PushPermissionResult> {
  const Notifications = await loadNotifications();
  if (!Notifications) {
    return { status: 'unavailable', token: null };
  }

  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const asked = await Notifications.requestPermissionsAsync();
      status = asked.status;
    }
    if (status !== 'granted') {
      return { status: status as PushPermissionResult['status'], token: null };
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return { status: 'granted', token: tokenResponse.data };
  } catch {
    return { status: 'unavailable', token: null };
  }
}
