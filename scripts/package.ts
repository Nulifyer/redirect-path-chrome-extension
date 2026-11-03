import { mkdir, readFile, writeFile, copyFile, rm, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const args = process.argv.slice(2);
const tag = args.find(a=>a.startsWith('--tag='))?.slice(6);
const check = args.includes('--check');
if (args.some(a=>a!=='--check'&&!a.startsWith('--tag='))) throw new Error('Usage: bun run package [--check] [--tag=vVERSION]');
const pkg = JSON.parse(await readFile('package.json','utf8'));
const manifest = JSON.parse(await readFile('extension/manifest.json','utf8'));
if (!/^\d+\.\d+\.\d+$/.test(pkg.version)||pkg.version.split('.').some((n:string)=>Number(n)>65535)||pkg.version!==manifest.version) throw new Error('Package and manifest versions must match and use a valid Chrome version');
const git=(...values:string[])=>execFileSync('git',values,{encoding:'utf8'}).trim();
let commit: string | null=null;
try {commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();} catch {}
const dirty=git('status','--porcelain').length>0 || !commit;
if(tag) {
  if(tag!==`v${pkg.version}`) throw new Error('Tag does not match package version');
  if(dirty) throw new Error('A tagged release requires clean committed source');
  if(git('rev-parse',`${tag}^{commit}`)!==commit) throw new Error('Tag must point to the current source commit');
}
if(check){console.log(JSON.stringify({version:pkg.version,commit,dirty,tag:tag??null}));process.exit(0);}
await import('./build');
const directory='dist/release';
await rm(directory,{recursive:true,force:true});
await mkdir(join(directory,'extension'),{recursive:true});
for(const file of await readdir('dist/extension')) await copyFile(join('dist/extension',file),join(directory,'extension',file));

const metadata={name:manifest.name,version:pkg.version,repository:'Nulifyer/redirect-path-chrome-extension',sourceCommit:commit,tag:dirty?null:tag??null,dirty,distribution:'unpacked-zip'};
const release=JSON.stringify(metadata,null,2)+'\n';
await writeFile(join(directory,'release.json'),release);
await writeFile(join(directory,'extension/release.json'),release);
for(const [source,target] of [['LICENSE','LICENSE'],['docs/INSTALL.md','INSTALL.md'],['docs/PRIVACY.md','PRIVACY.md']]) {
  await copyFile(source,join(directory,'extension',target));
}
await copyFile('docs/INSTALL.md',join(directory,'INSTALL.md'));
await copyFile('scripts/update-redirect-inspector.py',join(directory,'update-redirect-inspector.py'));

// Include licenses for bundled production dependencies and their transitive dependencies.
const visited=new Set<string>();const notices:string[]=[];
async function licenses(name:string) {
  if(visited.has(name))return;visited.add(name);
  const root=join('node_modules',name);
  const info=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
  const file=(await readdir(root)).find(n=>/^licen[sc]e(?:\.|$)/i.test(n));
  if(!file)throw new Error(`Missing license text for ${name}`);
  notices.push(`${name} ${info.version}\n${await readFile(join(root,file),'utf8')}`);
  for(const dependency of Object.keys(info.dependencies??{}))await licenses(dependency);
}
for(const name of Object.keys(pkg.dependencies))await licenses(name);
await writeFile(join(directory,'extension/THIRD_PARTY_NOTICES.txt'),notices.join('\n\n----------------\n\n'));
const filename=`redirect-inspector-${pkg.version}-chromium.zip`;
execFileSync('python3',['-c',`import pathlib,zipfile,sys
root=pathlib.Path(sys.argv[1]);target=sys.argv[2]
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in sorted(root.iterdir()):
  if not p.is_file(): raise ValueError('Unexpected package directory')
  info=zipfile.ZipInfo(p.name,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
  z.writestr(info,p.read_bytes())`,join(directory,'extension'),join(directory,filename)]);
const checksum=createHash('sha256').update(await readFile(join(directory,filename))).digest('hex');
await writeFile(join(directory,'SHA256SUMS'),`${checksum}  ${filename}\n`);
console.log(`Packaged ${filename}, source ${commit??'uncommitted'}, dirty=${dirty}`);
