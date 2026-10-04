import {drizzle} from 'drizzle-orm/neon-http';
import {neon} from '@neondatabase/serverless';
import * as schema from './schema';
export function getDb(){return drizzle(neon(process.env.DATABASE_URL!),{schema});}
