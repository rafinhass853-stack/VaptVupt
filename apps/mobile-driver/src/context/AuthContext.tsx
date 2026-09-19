import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export interface DriverData {
  id: string;
  name: string;
  status: string;
  vehicleType: string;
  activeOrderId: string | null;
  cpf?: string;
  phone?: string;
  plate?: string;
  lat?: number;
  lng?: number;
}

interface SignupData {
  name: string;
  cpf: string;
  phone: string;
  plate: string;
  vehicleType: string;
}

interface AuthContextType {
  user: User | null;
  driver: DriverData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, data: SignupData) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [driver, setDriver] = useState<DriverData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const unsubDoc = onSnapshot(
          doc(db, "drivers", firebaseUser.uid),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setDriver({
                id: snap.id,
                name: data.name || "Motoboy",
                status: data.status || "OFFLINE",
                vehicleType: data.vehicleType || "MOTO",
                activeOrderId: data.activeOrderId || null,
                cpf: data.cpf,
                phone: data.phone,
                plate: data.plate,
                lat: data.lat,
                lng: data.lng,
              });
            }
          }
        );
        setLoading(false);
        return () => unsubDoc();
      } else {
        setDriver(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (
    email: string,
    password: string,
    data: SignupData
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "drivers", cred.user.uid), {
      uid: cred.user.uid,
      name: data.name,
      cpf: data.cpf,
      phone: data.phone,
      plate: data.plate,
      vehicleType: data.vehicleType,
      status: "OFFLINE",
      activeOrderId: null,
      fcmToken: "",
      currentGeohash: "",
      approved: true, // Por padrão aprovado; no Admin pode bloquear
      createdAt: new Date(),
    });
  };

  const logout = async () => {
    await signOut(auth);
    setDriver(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, driver, loading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}