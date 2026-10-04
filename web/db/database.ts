import {neon, type NeonQueryFunction} from '@neondatabase/serverless';

// Keep all SQL parameterized. Transactions preserve consent revocation and cascades.
class Statement {
  private values: unknown[]=[];
  private client:NeonQueryFunction<false,false>;
  private sql:string;
  constructor(client:NeonQueryFunction<false,false>,sql:string){this.client=client;this.sql=sql;}
  bind(...values:unknown[]){this.values=values;return this;}
  query(){let n=0;return this.client.query(this.sql.replace(/\?/g,()=>`$${++n}`),this.values);}
  async first<T=Record<string,unknown>>():Promise<T|null>{return (await this.query())[0] as T||null;}
  async all(){return {results:await this.query()};}
  async run(){await this.query();return {success:true};}
}
export function database(){
  const url=process.env.DATABASE_URL;
  if(!url)throw new Error('DATABASE_URL is required');
  const client=neon(url);
  return {prepare:(sql:string)=>new Statement(client,sql),batch:(statements:Statement[])=>client.transaction(statements.map(s=>s.query()))};
}
