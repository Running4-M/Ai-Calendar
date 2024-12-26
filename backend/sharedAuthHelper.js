import { getAuth, onAuthStateChanged } from "firebase/auth";

let userId = null; // Shared userId variable accessible across files

/**
 * Initialize the userId by listening to Firebase Authentication state.
 * Resolves when the user is authenticated and their ID is available.
 */
export async function initializeUserId() {
  const auth = getAuth();
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        userId = user.uid; // Set the shared userId
        resolve(user.uid); // Resolve with the user ID
      } else {
        reject("User not logged in."); // Reject if no user is logged in
      }
    });
  });
}

/**
 * Get the current userId.
 * Throws an error if userId is not initialized.
 */
export function getUserId() {
  if (!userId) {
    throw new Error("User ID is not initialized. Call initializeUserId first.");
  }
  return userId;
}

/**
 * Check if the user is logged in. This can be used for conditional redirects.
 */
export function isUserLoggedIn() {
  return userId !== null;
}
