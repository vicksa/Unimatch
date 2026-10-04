import {neon, type NeonQueryFunction} from '@neondatabase/serverless';

// Keep all SQL parameterized. Transactions preserve consent revocation and cascades.
class Statement {
  private values: unknown[]=[];
  private client:NeonQueryFunction<false,false>;
  private sql:string;
  private schema?:string;
  constructor(client:NeonQueryFunction<false,false>,sql:string,schema?:string){this.client=client;this.sql=sql;this.schema=schema;}
  bind(...values:unknown[]){this.values=values;return this;}
  query(){let n=0;return this.client.query(this.sql.replace(/\?/g,()=>`$${++n}`),this.values);}
  async execute(){return this.schema?(await this.client.transaction([this.client.query("SELECT set_config('search_path',$1,true)",[this.schema]),this.query()]))[1]:await this.query();}
  async first<T=Record<string,unknown>>():Promise<T|null>{return (await this.execute())[0] as T||null;}
  async all(){return {results:await this.execute()};}
  async run(){await this.execute();return {success:true};}
}
export function database(schema?:string){
  if(schema&&!/^test_[a-f0-9]+$/.test(schema))throw new Error('Invalid test schema');
  const url=process.env.DATABASE_URL;
  if(!url)throw new Error('DATABASE_URL is required');
  const client=neon(url);
  return {prepare:(sql:string)=>new Statement(client,sql,schema),batch:async(statements:Statement[])=>{const queries=statements.map(s=>s.query());if(schema)queries.unshift(client.query("SELECT set_config('search_path',$1,true)",[schema]));const results=await client.transaction(queries);return schema?results.slice(1):results}};
}
