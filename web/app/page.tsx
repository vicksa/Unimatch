import {getChatGPTUser} from './chatgpt-auth';
import CampusApp from './campus-app';
export const dynamic='force-dynamic';
export default async function Page(){const u=await getChatGPTUser();return <CampusApp signedIn={!!u}/>}
