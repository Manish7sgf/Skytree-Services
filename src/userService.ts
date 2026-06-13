import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';

const USERS_COLLECTION = 'users';

const DEFAULT_USERS = [
  {
    id: 1,
    name: 'Admin User',
    shopName: 'Admin Hub',
    email: 'admin@portal.com',
    phone: '0000000000',
    district: 'Tamilnadu',
    address: '',
    username: 'Admin',
    password: 'Rasool@',
    role: 'ADMIN',
    status: 'Approved',
    balance: 0,
    transactions: [],
    services: [],
  },
  {
    id: 2,
    name: 'Sample Retailer',
    shopName: 'Sample Shop',
    email: 'sample@retail.com',
    phone: '9876543210',
    district: 'Chennai',
    address: '',
    username: 'Sample',
    password: 'Welcome@123',
    role: 'USER',
    status: 'Approved',
    balance: 500,
    transactions: [],
    services: [],
  },
];

// Seed default users if Firestore is empty
export const seedUsersIfEmpty = async () => {
  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  console.log('Checking if Firestore is empty...');
  console.log('Snapshot empty:', snapshot.empty);
  if (snapshot.empty) {
    for (const user of DEFAULT_USERS) {
      await setDoc(doc(db, USERS_COLLECTION, String(user.id)), user);
    }
  }
};

// Subscribe to users collection in real-time
export const subscribeToUsers = (callback: (users: any[]) => void) => {
  return onSnapshot(collection(db, USERS_COLLECTION), (snapshot: any) => {
    const users = snapshot.docs.map((d: any) => ({
      ...d.data(),
      id: Number(d.id),
    }));
    callback(users);
  });
};

// Save a single user to Firestore
export const saveUser = async (user: any) => {
  await setDoc(doc(db, USERS_COLLECTION, String(user.id)), user);
};

// Update specific fields of a user
export const updateUser = async (userId: number, updates: any) => {
  await updateDoc(doc(db, USERS_COLLECTION, String(userId)), updates);
};

// Delete a user
export const deleteUser = async (userId: number) => {
  await deleteDoc(doc(db, USERS_COLLECTION, String(userId)));
};

// Force seed default users to Firestore (use with caution)
export const forceReseedUsers = async () => {
  const defaultUsersData = [
    {
      id: 1,
      name: 'Admin User',
      shopName: 'Admin Hub',
      email: 'admin@portal.com',
      phone: '0000000000',
      district: 'Tamilnadu',
      address: '',
      username: 'Admin',
      password: 'Rasool@',
      role: 'ADMIN',
      status: 'Approved',
      balance: 0,
      transactions: [],
      services: [],
    },
    {
      id: 2,
      name: 'Sample Retailer',
      shopName: 'Sample Shop',
      email: 'sample@retail.com',
      phone: '9876543210',
      district: 'Chennai',
      address: '',
      username: 'Sample',
      password: 'Welcome@123',
      role: 'USER',
      status: 'Approved',
      balance: 500,
      transactions: [],
      services: [],
    },
  ];
  for (const user of defaultUsersData) {
    await setDoc(doc(db, USERS_COLLECTION, String(user.id)), user);
    console.log('Seeded user:', user.username);
  }
};

// Save all users (batch update)
export const saveAllUsers = async (users: any[]) => {
  for (const user of users) {
    await setDoc(doc(db, USERS_COLLECTION, String(user.id)), user);
  }
};