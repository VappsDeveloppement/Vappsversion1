
'use server';

// La fonctionnalité de création d'utilisateur a été supprimée.

export async function createUser(userData: any) {
  console.error('La fonction createUser est obsolète et ne doit pas être utilisée.');
  return { success: false, error: "Cette fonctionnalité a été supprimée." };
}
