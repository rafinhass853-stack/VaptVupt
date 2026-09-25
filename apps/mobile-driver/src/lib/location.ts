import * as Location from "expo-location";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

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

  await updateDriverLocation(driverId, current.coords.latitude, current.coords.longitude);

  subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 20,
    },
    async (position) => {
      try {
        await updateDriverLocation(
          driverId,
          position.coords.latitude,
          position.coords.longitude
        );
      } catch (error) {
        console.warn("Erro ao atualizar localização:", error);
      }
    }
  );
}

async function updateDriverLocation(driverId: string, lat: number, lng: number) {
  await updateDoc(doc(db, "drivers", driverId), {
    lat,
    lng,
    lastLocationAt: new Date(),
  });
}

export async function stopLocationTracking() {
  if (!subscription) return;
  subscription.remove();
  subscription = null;
}
