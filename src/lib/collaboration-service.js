import { db } from './firebase';
import {
  collection, doc, setDoc, getDoc,
  serverTimestamp, onSnapshot, query, orderBy
} from 'firebase/firestore';

export async function createRoom({ name, type, linkedRepo = '', linkedIssue = '' }) {
  const roomRef = doc(collection(db, 'collaborationRooms'));
  await setDoc(roomRef, {
    name,
    type,
    linkedRepo,
    linkedIssue,
    createdAt: serverTimestamp(),
    lastActivity: serverTimestamp()
  });
  return roomRef.id;
}

export async function getRoom(roomId) {
  const snap = await getDoc(doc(db, 'collaborationRooms', roomId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeToMessages(roomId, callback) {
  const q = query(
    collection(db, 'roomMessages', roomId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, snap => {
    const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
}
