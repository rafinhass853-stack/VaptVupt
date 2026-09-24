import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

export interface StoreData {
  id: string;
  name: string;
  slug: string;
  balance: number;
  uid: string;
  address: { street: string; number: string; lat: number; lng: number };
}

interface StoreContextType {
  user: User | null;
  store: StoreData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshStore: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStore = async (u: User) => {
    try {
      const q = query(collection(db, "stores"), where("uid", "==", u.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        setStore({
          id: docSnap.id,
          name: data.name || "",
          slug: data.slug || "",
          balance: data.balance || 0,
          uid: data.uid || "",
          address: data.address || { street: "", number: "", lat: 0, lng: 0 },
        });
      } else {
        // Fallback: se não achou por uid, pega a primeira loja (modo demo)
        const allSnap = await getDocs(collection(db, "stores"));
        if (!allSnap.empty) {
          const docSnap = allSnap.docs[0];
          const data = docSnap.data();
          setStore({
            id: docSnap.id,
            name: data.name || "",
            slug: data.slug || "",
            balance: data.balance || 0,
            uid: data.uid || "",
            address: data.address || { street: "", number: "", lat: 0, lng: 0 },
          });
        }
      }
    } catch (err) {
      console.error("Erro ao carregar loja:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await loadStore(firebaseUser);
      } else {
        setStore(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setStore(null);
  };

  const refreshStore = async () => {
    if (user) await loadStore(user);
  };

  return (
    <StoreContext.Provider value={{ user, store, loading, login, logout, refreshStore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore deve ser usado dentro de StoreProvider");
  return context;
}