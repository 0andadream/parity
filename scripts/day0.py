import json, subprocess, concurrent.futures, datetime, re
from pathlib import Path
OUT=Path("data/day0")
OUT.mkdir(parents=True,exist_ok=True)
def get(url, payload=None):
 args=["curl","-sS","--max-time","30",url]
 if payload is not None: args += ["-H","Content-Type: application/json","--data",json.dumps(payload)]
 r=subprocess.run(args,capture_output=True,text=True)
 try: return json.loads(r.stdout)
 except: return {"body":r.stdout,"error":r.stderr or None}
def save(name,value):
 (OUT/(name+".json")).write_text(json.dumps(value,indent=2))
 return value
catalogue=save("catalogue",get("https://prestocks.com/api/prestocks"))
assets={x["symbol"]:x["contract_address"] for x in catalogue if x["symbol"] in ["OPENAI","ANTHROPIC","SPACEX"]}
assets["XAI"]="PreC1KtJ1sBPPqaeeqL6Qb15GTLCYVvyYEwxhdfTwfx"
def scan(item):
 symbol,mint=item
 rpc=get("https://api.mainnet-beta.solana.com",{"jsonrpc":"2.0","id":1,"method":"getAccountInfo","params":[mint,{"encoding":"jsonParsed","commitment":"finalized"}]})
 save(symbol+"-rpc",rpc)
 quote=get("https://lite-api.jup.ag/swap/v1/quote?inputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&outputMint="+mint+"&amount=500000000&slippageBps=50")
 save(symbol+"-jupiter",quote)
 print(symbol,json.dumps(rpc)[:180],json.dumps(quote)[:180])
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: list(pool.map(scan,assets.items()))
for name in ["xai","spacex","openai","anthropic","faq"]:
 data=get("https://prestocks.com/"+name)
 (OUT/(name+".html")).write_text(data.get("body",str(data)))
save("observation",{"observedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),"rpc":"https://api.mainnet-beta.solana.com"})
