import * as Location from "expo-location";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { startBackgroundLocation, stopBackgroundLocation } from "./backgroundLocation";

let subscription: Location.LocationSubscription | null = null;

export async function startLocationTracking(driverId: string) {
  if (subscription) return;

  const foreground = await Location.requestForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    throw new Error("Permissão de localização não concedida.");
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  await updateDriverLocation(current.coords.latitude, current.coords.longitude, current.coords.accuracy ?? 0);

  try { await startBackgroundLocation(driverId); } catch (error) { console.warn("Background location indisponível:", error); }

  subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 20,
    },
    async (position) => {
      try {
        await updateDriverLocation(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy ?? 0
        );
      } catch (error) {
        console.warn("Erro ao atualizar localização:", error);
      }
    }
  );
}

async function updateDriverLocation(lat: number, lng: number, accuracy: number) {
  const updateLocation = httpsCallable(functions, "registerDriverLocation");
  await updateLocation({ lat, lng, accuracy });
}

export async function stopLocationTracking() {
  if (!subscription) return;
  subscription.remove();
  subscription = null;
  try { await stopBackgroundLocation(); } catch {}
}
