import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function sendMessage(roomId, { content, authorId, authorName, authorAvatar }) {
  await addDoc(
    collection(db, 'roomMessages', roomId, 'messages'),
    {
      content,
      authorId,
      authorName,
      authorAvatar,
      timestamp: serverTimestamp(),
      edited: false
    }
  );
}
