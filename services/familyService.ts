import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ChildProfile, Family, UserProfile } from '@/lib/firestoreModels';

const INVITE_CODE_LENGTH = 6;
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const collectionNames = {
  users: 'users',
  families: 'families',
  children: 'children',
  quizAnswers: 'quizAnswers',
  results: 'results',
  taskCards: 'taskCards',
  taskAssignments: 'taskAssignments',
  todos: 'todos',
  mentalLoadItems: 'mentalLoadItems',
  checkins: 'checkins',
} as const;

function generateInviteCode() {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)];
  }
  return code;
}

async function generateUniqueInviteCode(): Promise<string> {
  let foundUnique = false;
  let inviteCode = '';

  while (!foundUnique) {
    inviteCode = generateInviteCode();
    const existing = await getDocs(
      query(collection(db, collectionNames.families), where('inviteCode', '==', inviteCode), limit(1)),
    );
    foundUnique = existing.empty;
  }

  return inviteCode;
}

export async function createUserProfile(params: {
  uid: string;
  email: string;
  displayName: string;
}) {
  const userRef = doc(db, collectionNames.users, params.uid);
  await setDoc(userRef, {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName,
    familyId: null,
    createdAt: serverTimestamp(),
  } satisfies Omit<UserProfile, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> });
}

export async function createFamily(params: { uid: string; familyName: string }) {
  const familyId = doc(collection(db, collectionNames.families)).id;
  const inviteCode = await generateUniqueInviteCode();

  const familyRef = doc(db, collectionNames.families, familyId);
  const userRef = doc(db, collectionNames.users, params.uid);

  await runTransaction(db, async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) {
      throw new Error('Benutzerprofil wurde nicht gefunden.');
    }

    transaction.set(familyRef, {
      familyId,
      name: params.familyName,
      inviteCode,
      memberIds: [params.uid],
      createdAt: serverTimestamp(),
    } satisfies Omit<Family, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> });

    transaction.update(userRef, { familyId });
  });

  return { familyId, inviteCode };
}

export async function joinFamilyByInviteCode(params: { uid: string; inviteCode: string }) {
  const cleanCode = params.inviteCode.trim().toUpperCase();
  const familyQuery = query(
    collection(db, collectionNames.families),
    where('inviteCode', '==', cleanCode),
    limit(1),
  );
  const familySnapshot = await getDocs(familyQuery);

  if (familySnapshot.empty) {
    throw new Error('Kein Familienkonto mit diesem Einladungscode gefunden.');
  }

  const familyDoc = familySnapshot.docs[0];
  const familyRef = doc(db, collectionNames.families, familyDoc.id);
  const userRef = doc(db, collectionNames.users, params.uid);

  await runTransaction(db, async (transaction) => {
    const currentFamily = await transaction.get(familyRef);
    const currentUser = await transaction.get(userRef);

    if (!currentFamily.exists()) {
      throw new Error('Familie wurde nicht gefunden.');
    }

    if (!currentUser.exists()) {
      throw new Error('Benutzerprofil wurde nicht gefunden.');
    }

    const familyData = currentFamily.data() as Pick<Family, 'memberIds' | 'familyId'>;
    const newMemberIds = familyData.memberIds.includes(params.uid)
      ? familyData.memberIds
      : [...familyData.memberIds, params.uid];

    transaction.update(familyRef, { memberIds: newMemberIds });
    transaction.update(userRef, { familyId: familyData.familyId });
  });

  return { familyId: familyDoc.id };
}

export async function createChildProfile(params: {
  familyId: string;
  name: string;
  birthDate: string;
}) {
  const childRef = doc(collection(db, collectionNames.children));
  await setDoc(childRef, {
    childId: childRef.id,
    familyId: params.familyId,
    name: params.name,
    birthDate: params.birthDate,
    createdAt: serverTimestamp(),
  } satisfies Omit<ChildProfile, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> });

  return { childId: childRef.id };
}

export { collectionNames };
