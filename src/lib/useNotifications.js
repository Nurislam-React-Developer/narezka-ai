/**
 * useNotifications — хук для работы с браузерными Push-уведомлениями.
 *
 * Особенности:
 * - Запрашивает разрешение на уведомления при первом вызове notify()
 * - SSR-безопасен (Notification API доступен только в браузере)
 * - Fallback: если уведомления запрещены, ничего не делаем (showToast уже есть)
 *
 * Использование:
 *   const { notify, requestPermission } = useNotifications();
 *   notify("Клипы готовы!", { body: "10 клипов нарезано", icon: "/favicon.ico" });
 */

import { useCallback, useRef } from "react";

export function useNotifications() {
  const permissionRef = useRef(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  // Запрашиваем разрешение явно (вызывать до ожидаемого уведомления)
  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied";
    if (permissionRef.current === "granted") return "granted";
    if (permissionRef.current === "denied") return "denied";

    try {
      const result = await Notification.requestPermission();
      permissionRef.current = result;
      return result;
    } catch {
      return "denied";
    }
  }, []);

  // Отправить уведомление
  const notify = useCallback(
    async (title, options = {}) => {
      if (typeof Notification === "undefined") return;

      // Если разрешение ещё не запрошено — запрашиваем сейчас
      if (permissionRef.current === "default") {
        await requestPermission();
      }

      if (permissionRef.current !== "granted") return;

      // Не показываем уведомление если вкладка активна и видима
      if (document.visibilityState === "visible") return;

      try {
        const notification = new Notification(title, {
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          ...options,
        });

        // Клик по уведомлению — фокусируем и открываем вкладку
        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Автозакрытие через 8 секунд
        setTimeout(() => notification.close(), 8000);
      } catch {
        // Некоторые браузеры (Safari) могут выбросить ошибку — игнорируем
      }
    },
    [requestPermission]
  );

  return { notify, requestPermission };
}
