import {auth,currentUser} from '@clerk/nextjs/server';
export async function getUser(includeDetails=true){const {userId}=await auth();if(!userId)return null;const u=includeDetails?await currentUser():null;return {userId,fullName:u?.fullName||null,email:u?.primaryEmailAddress?.emailAddress||''};}
