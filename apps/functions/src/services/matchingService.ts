import * as admin from "firebase-admin";
import { haversineDistanceKm, geohashQueryBounds } from "./geoService";

export interface MatchingCandidate {
  driverId: string;
  distanceKm: number;
  activeOrderId: string | null;
  totalDeliveries: number;
  lastLocationUpdate: Date | null;
}

const MATCHING_CONFIG = {
  radii: [3, 5, 10, 20, 50],
  maxCandidates: 20,
  maxAgeMinutes: 5,
};

export async function findBestDriver(
  pickupLat: number,
  pickupLng: number,
  rejectedIds: string[] = []
): Promise<MatchingCandidate | null> {
  for (const radiusKm of MATCHING_CONFIG.radii) {
    const candidates = await findCandidatesInRadius(
      pickupLat,
      pickupLng,
      radiusKm,
      rejectedIds
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
  rejectedIds: string[]
): Promise<MatchingCandidate[]> {
  // Acessa o Firestore de forma lazy (após initializeApp)
  const db = admin.firestore();

  const bounds = geohashQueryBounds(lat, lng, radiusKm);
  const now = new Date();
  const minAge = new Date(now.getTime() - MATCHING_CONFIG.maxAgeMinutes * 60 * 1000);

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

  return candidates.slice(0, MATCHING_CONFIG.maxCandidates);
}