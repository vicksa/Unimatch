import {auth,currentUser} from '@clerk/nextjs/server';
export async function getUser(){const {userId}=await auth();if(!userId)return null;const u=await currentUser();return {userId,fullName:u?.fullName||null,email:u?.primaryEmailAddress?.emailAddress||''};}
