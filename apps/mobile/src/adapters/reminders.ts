import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { Settings, ReminderPort } from "@meniere/product-core";

export const reminders: ReminderPort = {
  async clear() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
  async apply(settings: Settings) {
    await this.clear();
    if (!settings.reminder.enabled || settings.reminder.paused) return true;
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync("daily-check", {
        name: "Daily check",
        importance: Notifications.AndroidImportance.DEFAULT,
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PRIVATE,
      });
    let permissions = await Notifications.getPermissionsAsync();
    if (!permissions.granted)
      permissions = await Notifications.requestPermissionsAsync();
    if (!permissions.granted) return false;
    await Notifications.scheduleNotificationAsync({
      content: {
        title:
          settings.language === "ko"
            ? "잠깐 돌아볼 시간"
            : "A moment to check in",
        body:
          settings.language === "ko"
            ? "편할 때 오늘을 기록해 주세요."
            : "Check in when it feels comfortable.",
        sound: false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.reminder.hour,
        minute: settings.reminder.minute,
        channelId: "daily-check",
      },
    });
    return true;
  },
};
