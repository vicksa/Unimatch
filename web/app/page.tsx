import {getUser} from './auth';
import CampusApp from './campus-app';
export const dynamic='force-dynamic';
export default async function Page(){const u=await getUser();return <CampusApp signedIn={!!u}/>}
