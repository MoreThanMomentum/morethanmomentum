/**
 * MTM Prospect Slides — Pages Function
 * Route: POST /api/slides-prospect
 * Uses duplicateObject (not addSlide). Anyone with link can view.
 */
const SLIDES_API = 'https://slides.googleapis.com/v1/presentations';
const DRIVE_API  = 'https://www.googleapis.com/drive/v3/files';
const TOKEN_URL  = 'https://oauth2.googleapis.com/token';
const W = 9144000, H = 5143500;
const em = (i) => Math.round(i * 914400);
const C = {
  black:  {red:0.047,green:0.047,blue:0.047}, dark:{red:0.067,green:0.067,blue:0.067},
  card:   {red:0.102,green:0.102,blue:0.102}, blue:{red:0.176,green:0.420,blue:0.894},
  accent: {red:0.357,green:0.561,blue:0.941}, yellow:{red:0.961,green:0.773,blue:0.094},
  green:  {red:0.290,green:0.871,blue:0.502}, red:{red:0.973,green:0.427,blue:0.427},
  white:  {red:0.957,green:0.957,blue:0.949}, gray:{red:0.533,green:0.533,blue:0.533},
};

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  try {
    const { brief: b } = await request.json();
    if (!b) return new Response(JSON.stringify({ error: 'Brief data required.' }), { status:400, headers });
    if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET || !env.GOOGLE_OAUTH_REFRESH_TOKEN) {
      return new Response(JSON.stringify({ error: 'Google OAuth not configured.', setupRequired: true }), { status:500, headers });
    }
    const token = await getToken(env);
    const title = `MTM Audit — ${b.businessName||'Prospect'} — ${new Date().toLocaleDateString()}`;
    const url = await buildDeck(b, title, token);
    return new Response(JSON.stringify({ success:true, url }), { headers });
  } catch(err) {
    console.error('Prospect slides:', err.message);
    return new Response(JSON.stringify({ error: err.message||'Failed.' }), { status:500, headers });
  }
}

async function getToken(env) {
  const r = await fetch(TOKEN_URL, { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body: new URLSearchParams({ client_id:env.GOOGLE_OAUTH_CLIENT_ID, client_secret:env.GOOGLE_OAUTH_CLIENT_SECRET, refresh_token:env.GOOGLE_OAUTH_REFRESH_TOKEN, grant_type:'refresh_token' }) });
  const d = await r.json();
  if (!d.access_token) throw new Error(`OAuth failed: ${JSON.stringify(d)}`);
  return d.access_token;
}

async function batch(pid, requests, token) {
  if (!requests.length) return;
  const r = await fetch(`${SLIDES_API}/${pid}:batchUpdate`, { method:'POST', headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({requests}) });
  const d = await r.json();
  if (d.error) throw new Error(`batchUpdate failed: ${JSON.stringify(d.error)}`);
}

async function buildDeck(b, title, token) {
  // Create presentation
  const cr = await fetch(SLIDES_API, { method:'POST', headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({title}) });
  const pres = await cr.json();
  const pid = pres.presentationId;
  if (!pid) throw new Error(`Create failed: ${JSON.stringify(pres)}`);
  const src = pres.slides?.[0]?.objectId;
  if (!src) throw new Error('No default slide');

  const S = { cover:src, grade:'sp_grade', social:'sp_social', gaps:'sp_gaps', comp:'sp_comp', proposal:'sp_proposal', cta:'sp_cta' };

  // Duplicate source slide 6x
  await batch(pid, [
    {duplicateObject:{objectId:src, objectIds:{[src]:S.grade}}},
    {duplicateObject:{objectId:src, objectIds:{[src]:S.social}}},
    {duplicateObject:{objectId:src, objectIds:{[src]:S.gaps}}},
    {duplicateObject:{objectId:src, objectIds:{[src]:S.comp}}},
    {duplicateObject:{objectId:src, objectIds:{[src]:S.proposal}}},
    {duplicateObject:{objectId:src, objectIds:{[src]:S.cta}}},
  ], token);

  // Set backgrounds
  const p = b.profile || {};
  const gc = {A:C.green,B:C.accent,C:C.yellow,D:{red:0.984,green:0.545,blue:0.230},F:C.red}[p.overallGrade]||C.gray;
  const bgs = {[S.cover]:C.black,[S.grade]:C.dark,[S.social]:C.dark,[S.gaps]:C.black,[S.comp]:C.dark,[S.proposal]:C.black,[S.cta]:C.black};
  await batch(pid, Object.entries(bgs).map(([id,c])=>({updatePageProperties:{objectId:id,pageProperties:{pageBackgroundFill:{solidFill:{color:{rgbColor:c}}}},fields:'pageBackgroundFill'}})), token);

  // Add content
  await batch(pid, content(b, S, gc, p), token);

  // Share — anyone with link can view
  await fetch(`${DRIVE_API}/${pid}/permissions?sendNotificationEmail=false`, { method:'POST', headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify({role:'reader',type:'anyone'}) });

  return `https://docs.google.com/presentation/d/${pid}/edit`;
}

function content(b, S, gc, p) {
  const sm = p.socialMedia||{};
  const gaps = b.gapAnalysis||[];
  const tps = b.talkingPoints||[];
  const ap = b.recommendedApproach||b.recommendedPackage||{};
  const sc = s => s==='Active'?C.green:s==='Inactive'?C.yellow:C.gray;
  const r = [];

  // Slide 1 — Cover
  r.push(...bg(S.cover,C.black),...rx(S.cover,0,0,0.06,5.625,C.blue),...tx(S.cover,'MORE THAN MOMENTUM',0.4,0.5,9.2,0.5,{size:13,bold:true,color:C.blue}),...tx(S.cover,'Digital Presence Audit',0.4,1.1,9.2,0.8,{size:42,bold:true,color:C.white}),...tx(S.cover,b.businessName||'',0.4,2.2,9.2,0.7,{size:30,bold:true,color:C.accent}),...tx(S.cover,b.city||'',0.4,2.95,9.2,0.5,{size:18,color:C.gray}),...tx(S.cover,new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}),0.4,4.9,9.2,0.4,{size:11,color:C.gray}));

  // Slide 2 — Grade
  r.push(...bg(S.grade,C.dark),...rx(S.grade,0.4,0.25,1.8,0.05,gc),...tx(S.grade,'Your Digital Grade',0.4,0.45,9.2,0.5,{size:22,bold:true,color:C.white}),...rx(S.grade,0.4,1.2,1.6,1.6,gc),...tx(S.grade,p.overallGrade||'?',0.45,1.25,1.5,1.5,{size:80,bold:true,color:C.white,align:'CENTER'}),...tx(S.grade,p.gradeSummary||'',2.3,1.3,7.0,1.4,{size:22,color:C.white}),...tx(S.grade,`Website: ${p.websitePlatform||'Unknown'} · ${p.websiteQuality||'Unknown'}`,2.3,2.8,7.0,0.4,{size:14,color:C.gray}),...tx(S.grade,`Google Reviews: ${p.googleReviews||'Not Found'}`,2.3,3.2,7.0,0.4,{size:14,color:C.gray}));

  // Slide 3 — Social
  r.push(...bg(S.social,C.dark),...rx(S.social,0.4,0.25,1.5,0.05,C.blue),...tx(S.social,'Social Media Presence',0.4,0.45,9.2,0.5,{size:22,bold:true,color:C.white}));
  [['Instagram','instagram'],['Facebook','facebook'],['TikTok','tiktok'],['LinkedIn','linkedin']].forEach(([n,k],i)=>{
    const st=sm[k]||'None', x=0.4+(i%2)*4.7, y=1.3+Math.floor(i/2)*1.7;
    r.push(...rx(S.social,x,y,4.3,1.4,C.card),...rx(S.social,x,y,0.04,1.4,sc(st)),...tx(S.social,n,x+0.2,y+0.2,3.0,0.45,{size:16,bold:true,color:C.white}),...tx(S.social,st,x+0.2,y+0.7,3.0,0.45,{size:22,bold:true,color:sc(st)}));
  });

  // Slide 4 — Gaps
  r.push(...bg(S.gaps,C.black),...rx(S.gaps,0.4,0.25,1.5,0.05,C.yellow),...tx(S.gaps,"What's Missing",0.4,0.45,9.2,0.5,{size:22,bold:true,color:C.white}),...tx(S.gaps,'These gaps are costing you leads right now.',0.4,0.98,9.2,0.4,{size:14,color:C.gray}));
  gaps.forEach((g,i)=>r.push(...rx(S.gaps,0.4,1.65+i*0.7,0.04,0.45,C.yellow),...tx(S.gaps,g,0.7,1.65+i*0.7,8.8,0.5,{size:14,color:C.white})));

  // Slide 5 — Competitors
  r.push(...bg(S.comp,C.dark),...rx(S.comp,0.4,0.25,1.5,0.05,C.red),...tx(S.comp,"While You're Not Here...",0.4,0.45,9.2,0.5,{size:22,bold:true,color:C.white}),...tx(S.comp,'Your competitors are.',0.4,0.98,9.2,0.4,{size:14,color:C.gray}));
  tps.forEach((t,i)=>r.push(...rx(S.comp,0.4,1.65+i*0.8,0.04,0.55,C.blue),...tx(S.comp,t,0.7,1.65+i*0.8,8.8,0.6,{size:13,color:C.white})));

  // Slide 6 — Proposal
  r.push(...bg(S.proposal,C.black),...rx(S.proposal,0.4,0.25,1.5,0.05,C.green),...tx(S.proposal,"What We'd Build For You",0.4,0.45,9.2,0.5,{size:22,bold:true,color:C.white}),...tx(S.proposal,ap.track||'',0.4,1.1,9.2,0.4,{size:12,color:C.accent}),...tx(S.proposal,ap.scope||ap.name||'',0.4,1.55,9.2,0.6,{size:20,bold:true,color:C.white}),...tx(S.proposal,ap.rationale||'',0.4,2.3,9.2,1.5,{size:15,color:C.gray}),...rx(S.proposal,0.4,4.2,9.2,0.06,C.blue),...tx(S.proposal,'Performance-based pricing. You pay less until we prove it works.',0.4,4.35,9.2,0.4,{size:13,color:C.accent}));

  // Slide 7 — CTA
  r.push(...bg(S.cta,C.black),...rx(S.cta,0.4,0.25,9.2,0.05,C.blue),...tx(S.cta,'More Than Momentum',0.4,0.5,9.2,0.5,{size:14,bold:true,color:C.blue}),...tx(S.cta,'Ready to\nfix this?',0.4,1.2,9.2,2.0,{size:56,bold:true,color:C.white}),...tx(S.cta,"Let's talk next steps.",0.4,3.4,9.2,0.5,{size:20,color:C.gray}),...tx(S.cta,'morethanmomentum.com',0.4,4.9,9.2,0.4,{size:12,color:C.gray}));

  return r;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function uid(){return `sp_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;}
function fill(c){return{solidFill:{color:{rgbColor:c}}};}
function bg(sid,c){const id=uid();return[{createShape:{objectId:id,shapeType:'RECTANGLE',elementProperties:{pageObjectId:sid,size:{width:{magnitude:W,unit:'EMU'},height:{magnitude:H,unit:'EMU'}},transform:{scaleX:1,scaleY:1,translateX:0,translateY:0,unit:'EMU'}}}},{updateShapeProperties:{objectId:id,fields:'shapeBackgroundFill,outline',shapeProperties:{shapeBackgroundFill:fill(c),outline:{outlineFill:fill(c)}}}}];}
function rx(sid,x,y,w,h,c){const id=uid();return[{createShape:{objectId:id,shapeType:'RECTANGLE',elementProperties:{pageObjectId:sid,size:{width:{magnitude:em(w),unit:'EMU'},height:{magnitude:em(h),unit:'EMU'}},transform:{scaleX:1,scaleY:1,translateX:em(x),translateY:em(y),unit:'EMU'}}}},{updateShapeProperties:{objectId:id,fields:'shapeBackgroundFill,outline',shapeProperties:{shapeBackgroundFill:fill(c),outline:{outlineFill:fill(c)}}}}];}
function tx(sid,text,x,y,w,h,{size=18,bold=false,color=C.white,align='START'}={}){if(!text)return[];const id=uid();return[{createShape:{objectId:id,shapeType:'TEXT_BOX',elementProperties:{pageObjectId:sid,size:{width:{magnitude:em(w),unit:'EMU'},height:{magnitude:em(h),unit:'EMU'}},transform:{scaleX:1,scaleY:1,translateX:em(x),translateY:em(y),unit:'EMU'}}}},{insertText:{objectId:id,text:String(text)}},{updateTextStyle:{objectId:id,fields:'fontSize,bold,foregroundColor,fontFamily',style:{fontSize:{magnitude:size,unit:'PT'},bold,foregroundColor:{opaqueColor:{rgbColor:color}},fontFamily:'Arial'}}},{updateParagraphStyle:{objectId:id,fields:'alignment',style:{alignment:align}}}];}

export async function onRequestOptions(){return new Response(null,{headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});}
