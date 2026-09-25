import * as admin from "firebase-admin";
import { haversineDistanceKm, geohashQueryBounds } from "./geoService";

export interface MatchingCandidate {
  driverId: string;
  distanceKm: number;
  activeOrderId: string | null;
  totalDeliveries: number;
  lastLocationUpdate: Date | null;
}

const DEFAULT_MATCHING_CONFIG = {
  radii: [3, 5, 10, 20, 50],
  maxCandidates: 20,
  maxAgeMinutes: 5,
};

async function getMatchingConfig() {
  const db = admin.firestore();
  const snap = await db.collection("settings").doc("matching").get();
  if (!snap.exists) return DEFAULT_MATCHING_CONFIG;
  const data = snap.data() || {};
  const radii = Array.isArray(data.radii) ? data.radii.filter((n: any) => typeof n === "number" && n > 0 && n <= 100) : DEFAULT_MATCHING_CONFIG.radii;
  return {
    radii: radii.length ? radii : DEFAULT_MATCHING_CONFIG.radii,
    maxCandidates: typeof data.maxCandidates === "number" && data.maxCandidates > 0 ? Math.min(data.maxCandidates, 100) : DEFAULT_MATCHING_CONFIG.maxCandidates,
    maxAgeMinutes: typeof data.maxAgeMinutes === "number" && data.maxAgeMinutes > 0 ? Math.min(data.maxAgeMinutes, 30) : DEFAULT_MATCHING_CONFIG.maxAgeMinutes,
  };
}

export async function findBestDriver(
  pickupLat: number,
  pickupLng: number,
  rejectedIds: string[] = []
): Promise<MatchingCandidate | null> {
  const config = await getMatchingConfig();
  for (const radiusKm of config.radii) {
    const candidates = await findCandidatesInRadius(
      pickupLat,
      pickupLng,
      radiusKm,
      rejectedIds,
      config.maxAgeMinutes
    );
    if (candidates.length > 0) {
      console.log(`[MATCHING] Raio ${radiusKm}km: ${candidates.length} candidato(s)`);
      return candidates[0];
    }
  }
  return null;
}

async function findCandidatesInRadius(
  lat: number,
  lng: number,
  radiusKm: number,
  rejectedIds: string[],
  maxAgeMinutes: number
): Promise<MatchingCandidate[]> {
  // Acessa o Firestore de forma lazy (após initializeApp)
  const db = admin.firestore();

  const bounds = geohashQueryBounds(lat, lng, radiusKm);
  const now = new Date();
  const minAge = new Date(now.getTime() - maxAgeMinutes * 60 * 1000);

  const queries = bounds.map(([start, end]) =>
    db
      .collection("drivers")
      .orderBy("currentGeohash")
      .startAt(start)
      .endAt(end)
      .get()
  );

  const snapshots = await Promise.all(queries);
  const candidates: MatchingCandidate[] = [];
  const seen = new Set<string>();

  for (const snap of snapshots) {
    snap.docs.forEach((doc) => {
      if (seen.has(doc.id)) return;
      seen.add(doc.id);

      const data = doc.data();

      if (data.status !== "ONLINE") return;
      if (data.blocked) return;
      if (data.approved === false) return;
      if (data.activeOrderId) return;
      if (rejectedIds.includes(doc.id)) return;
      if (typeof data.lat !== "number" || typeof data.lng !== "number") return;

      const lastUpdate = data.lastLocationUpdate?.toDate?.();
      if (!lastUpdate || lastUpdate < minAge) return;

      const distanceKm = haversineDistanceKm(lat, lng, data.lat, data.lng);
      if (distanceKm > radiusKm) return;

      candidates.push({
        driverId: doc.id,
        distanceKm,
        activeOrderId: data.activeOrderId || null,
        totalDeliveries: data.totalDeliveries || 0,
        lastLocationUpdate: lastUpdate,
      });
    });
  }

  candidates.sort((a, b) => {
    const distDiff = a.distanceKm - b.distanceKm;
    if (Math.abs(distDiff) > 0.5) return distDiff;
    return a.totalDeliveries - b.totalDeliveries;
  });

  const config = await getMatchingConfig();
  return candidates.slice(0, config.maxCandidates);
}