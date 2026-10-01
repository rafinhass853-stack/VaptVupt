import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export const BACKGROUND_LOCATION_TASK = "vaptvupt-driver-background-location";

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.warn("Background location error:", error.message);
    return;
  }

  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  if (!locations?.length) return;

  const latest = locations[locations.length - 1];
  const driverId = latest?.coords ? await getActiveDriverId() : null;
  if (!driverId) return;

  try {
    await updateDoc(doc(db, "drivers", driverId), {
      lat: latest.coords.latitude,
      lng: latest.coords.longitude,
      lastLocationAt: new Date(),
      locationSource: "BACKGROUND",
    });
  } catch (err) {
    console.warn("Failed to persist background location:", err);
  }
});

async function getActiveDriverId(): Promise<string | null> {
  try {
    const result = await TaskManager.getTaskOptionsAsync(BACKGROUND_LOCATION_TASK);
    return (result as { driverId?: string } | null)?.driverId || null;
  } catch {
    return null;
  }
}

export async function startBackgroundLocation(driverId: string) {
  const foreground = await Location.getForegroundPermissionsAsync();
  if (foreground.status !== "granted") {
    throw new Error("Permissão de localização em primeiro plano não concedida.");
  }

  const background = await Location.requestBackgroundPermissionsAsync();
  if (background.status !== "granted") {
    throw new Error("Permissão de localização em segundo plano não concedida.");
  }

  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (running) return;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 5000,
    distanceInterval: 20,
    deferredUpdatesInterval: 5000,
    deferredUpdatesDistance: 20,
    foregroundService: {
      notificationTitle: "VaptVupt",
      notificationBody: "Localização ativa enquanto você está online.",
      notificationColor: "#168b45",
    },
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
  });

  const taskOptions = await TaskManager.getTaskOptionsAsync(BACKGROUND_LOCATION_TASK);
  if (taskOptions) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      ...taskOptions,
      driverId,
    } as any);
  }
}

export async function stopBackgroundLocation() {
  if (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
}
