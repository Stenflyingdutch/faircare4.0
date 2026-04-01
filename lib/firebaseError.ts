import { FirebaseError } from 'firebase/app';

const authErrorMessages: Record<string, string> = {
  'auth/invalid-email': 'Die E-Mail-Adresse ist ungültig.',
  'auth/missing-password': 'Bitte geben Sie ein Passwort ein.',
  'auth/weak-password': 'Das Passwort ist zu schwach (mindestens 6 Zeichen).',
  'auth/email-already-in-use': 'Diese E-Mail-Adresse wird bereits verwendet.',
  'auth/user-not-found': 'Für diese E-Mail wurde kein Konto gefunden.',
  'auth/wrong-password': 'Das Passwort ist nicht korrekt.',
  'auth/invalid-credential': 'Die Anmeldedaten sind ungültig.',
  'auth/too-many-requests': 'Zu viele Versuche. Bitte später erneut versuchen.',
  'auth/network-request-failed': 'Netzwerkfehler. Bitte Internetverbindung prüfen.',
  'auth/operation-not-allowed':
    'E-Mail/Passwort-Anmeldung ist in Firebase noch nicht aktiviert. Bitte in der Firebase Console unter Authentication → Sign-in method den Anbieter "E-Mail/Passwort" aktivieren.',
};

export function getGermanFirebaseError(error: unknown): string {
  if (error instanceof FirebaseError) {
    return authErrorMessages[error.code] ?? `Firebase-Fehler: ${error.code}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unbekannter Fehler';
}
