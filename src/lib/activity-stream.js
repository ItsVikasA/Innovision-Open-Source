import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';

export async function logActivity(userId, { type, metadata = {} }) {
  await addDoc(collection(db, 'contributorActivity', userId, 'activities'), {
    type,
    timestamp: serverTimestamp(),
    metadata
  });
}

export function subscribeToActivity(userId, callback) {
  const q = query(
    collection(db, 'contributorActivity', userId, 'activities'),
    orderBy('timestamp', 'desc'),
    limit(20)
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}
