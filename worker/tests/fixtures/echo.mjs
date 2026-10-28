const chunks=[];for await(const chunk of process.stdin)chunks.push(chunk);
process.stdout.write(JSON.stringify({ok:true,text:Buffer.concat(chunks).toString('utf8')}));
