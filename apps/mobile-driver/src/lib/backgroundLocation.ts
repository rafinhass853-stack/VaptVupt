import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";

export const BACKGROUND_LOCATION_TASK = "VAPT_VUPT_BACKGROUND_LOCATION";

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as any)?.locations || [];
  const location = locations[0];
  const driverId = await AsyncStorage.getItem("vapt_driver_id");
  if (!driverId || !location?.coords) return;
  const { latitude, longitude, accuracy } = location.coords;
  const updateLocation = httpsCallable(functions, "registerDriverLocation");
  await updateLocation({ lat: latitude, lng: longitude, accuracy: accuracy || 0 });
});

export async function startBackgroundLocation(driverId: string) {
  await AsyncStorage.setItem("vapt_driver_id", driverId);
  const permission = await Location.requestBackgroundPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Permissão de localização em segundo plano não concedida.");
  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (running) return;
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 10000,
    distanceInterval: 25,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "VaptVupt ativo",
      notificationBody: "Sua localização está sendo usada para a entrega.",
    },
  });
}

export async function stopBackgroundLocation() {
  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (running) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  await AsyncStorage.removeItem("vapt_driver_id");
}
