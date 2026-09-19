export interface StoreAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  lat: number;
  lng: number;
}

export interface Store {
  id: string;
  uid: string;
  name: string;
  slug: string;
  balance: number;
  address: StoreAddress;
  phone?: string;
  email?: string;
  cnpj?: string;
  logoUrl?: string;
  blocked?: boolean;
  createdAt: any;
  updatedAt?: any;
}