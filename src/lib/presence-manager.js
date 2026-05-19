import { db } from './firebase';
import { doc, setDoc, onSnapshot, serverTimestamp, collection } from 'firebase/firestore';

export async function setPresence(roomId, userId, status = 'active') {
  await setDoc(doc(db, 'presence', roomId, userId), {
    online: true,
    status,
    lastSeen: serverTimestamp()
  });
}

export async function setOffline(roomId, userId) {
  await setDoc(doc(db, 'presence', roomId, userId), {
    online: false,
    lastSeen: serverTimestamp()
  });
}

export function subscribeToPresence(roomId, callback) {
  return onSnapshot(
    collection(db, 'presence', roomId),
    snap => {
      const users = snap.docs.map(d => ({ userId: d.id, ...d.data() }));
      callback(users);
    }
  );
}
