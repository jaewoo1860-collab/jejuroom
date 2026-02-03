// pages/blog/blog.js (v2: 작성영역을 페이지 안에 표시)
(() => {
  const POSTS_JSON_URL = "./posts/index.json";
  const POSTS_PER_PAGE = 8;

  const ADMIN_ID = "admin";
  const ADMIN_PW = "Zxcv@134";

  let posts = [];
  let currentPage = 1;
  let isAdmin = false;

  const $ = (s) => document.querySelector(s);

  const postListEl = $("#postList");
  const paginationEl = $("#pagination");

  const writeBtn = $("#writeBtn");
  const composeWrap = $("#composeWrap");
  const composeCancel = $("#composeCancel");

  const postTitleEl = $("#postTitle");
  const postBodyEl = $("#postBody");
  const postImageEl = $("#postImage");
  const savePostBtn = $("#savePost");
  const saveNoteEl = $("#saveNote");

  function safeText(s){ return (s ?? "").toString(); }
  function escapeHtml(s){
    return safeText(s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function pad2(n){ return String(n).padStart(2,"0"); }
  function formatDateKST(d){
    const yyyy=d.getFullYear(), mm=pad2(d.getMonth()+1), dd=pad2(d.getDate());
    const hh=pad2(d.getHours()), mi=pad2(d.getMinutes());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  }
  function ymdhm(d){
    const yyyy=d.getFullYear(), mm=pad2(d.getMonth()+1), dd=pad2(d.getDate());
    const hh=pad2(d.getHours()), mi=pad2(d.getMinutes());
    return `${yyyy}${mm}${dd}-${hh}${mi}`;
  }
  function slugifyKo(title){
    const cleaned = safeText(title).trim()
      .replace(/[^\p{Script=Hangul}\p{Letter}\p{Number}\s-]/gu, "")
      .replace(/\s+/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"");
    return cleaned || "post";
  }
  function takeExcerpt(text){
    const t=safeText(text).trim().replace(/\s+/g," ");
    return t.length>60 ? t.slice(0,60)+"…" : t;
  }

  // CTA Button Generator
  function createCTAButton(){
    return `
    <div class="post-cta-wrapper">
      <a href="https://www.jejutoktokyi.com/" class="post-cta-button">
        제주똑똑이 문의하기
      </a>
    </div>
    `;
  }

  // Inject CTA into post content at render time
  function injectCTAIntoContent(html){
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const paragraphs = temp.querySelectorAll("p");

    // Insert CTA after 3rd paragraph (middle CTA)
    if (paragraphs.length >= 4) {
      paragraphs[2].insertAdjacentHTML("afterend", createCTAButton());
    }

    // Insert CTA at the end (bottom CTA)
    temp.insertAdjacentHTML("beforeend", createCTAButton());

    return temp.innerHTML;
  }

  async function loadPosts(){
    try{
      const res = await fetch(POSTS_JSON_URL,{cache:"no-store"});
      if(!res.ok) throw new Error("load failed");
      const data = await res.json();
      posts = Array.isArray(data)? data : [];
      posts.sort((a,b)=>(b.ts??0)-(a.ts??0));
    }catch(e){
      posts=[];
    }
  }

  function render(){
    const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    const start=(currentPage-1)*POSTS_PER_PAGE;
    const pagePosts=posts.slice(start,start+POSTS_PER_PAGE);

    if(pagePosts.length===0){
      postListEl.innerHTML = `<div class="emptyBox">아직 게시물이 없습니다.</div>`;
    }else{
      postListEl.innerHTML = pagePosts.map(p=>{
        const title=escapeHtml(p.title||"");
        const date=escapeHtml(p.date||"");
        const excerpt=escapeHtml(p.excerpt||"");
        const href=`./posts/${encodeURIComponent(p.file)}`;
        return `
          <article class="postCard">
            <a class="postCard__link" href="${href}">
              <div class="postCard__top">
                <div class="postCard__title">${title}</div>
                <div class="postCard__date">${date}</div>
              </div>
              <div class="postCard__excerpt">${excerpt}</div>
            </a>
          </article>
        `;
      }).join("");
    }

    paginationEl.innerHTML="";
    if(totalPages>1){
      for(let i=1;i<=totalPages;i++){
        const btn=document.createElement("button");
        btn.type="button";
        btn.className="pageBtn"+(i===currentPage?" isActive":"");
        btn.textContent=String(i);
        btn.addEventListener("click",()=>{currentPage=i; render();});
        paginationEl.appendChild(btn);
      }
    }
  }

  function downloadTextFile(filename, text){
    const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function downloadFileAs(file, filename){
    const url=URL.createObjectURL(file);
    const a=document.createElement("a");
    a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function textToHtmlLines(text){
    const lines=safeText(text).split(/\r?\n/).map(l=>escapeHtml(l));
    return lines.map(l=>l===""?"<br/>":`${l}<br/>`).join("");
  }

  function buildPostHtml({title,date,imageWebPath,bodyHtml}){
    const safeTitle=escapeHtml(title);
    const safeDate=escapeHtml(date);
    const imageBlock=imageWebPath?`<div class="postHero"><img src="${escapeHtml(imageWebPath)}" alt="${safeTitle}" loading="lazy"></div>`:"";
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} | 블로그 | 제주똑똑이</title>
  <link rel="stylesheet" href="/css/base.css" />
  <link rel="stylesheet" href="/css/theme.css" />
  <link rel="stylesheet" href="/css/particles.css" />
  <link rel="stylesheet" href="/css/page.css" />
  <link rel="stylesheet" href="/css/blog.css" />
</head>
<body>
  <div class="bg">
    <div class="glow glow-1"></div><div class="glow glow-2"></div><div class="glow glow-3"></div>
  </div>
  <div class="stage">
    <div class="phone">
      <div class="phone__notch" aria-hidden="true"></div>

      <header class="header">
        <a class="logo logo-brand" href="/index.html" aria-label="제주똑똑이 메인">
          <span class="logo__jeju">제주</span>
          <span class="logo__tok" aria-hidden="true">
            <span class="logo__tok--a">똑</span><span class="logo__tok--b">똑</span>
          </span>
          <span class="logo__i">이</span>
        </a>
        <label class="hamburger" for="nav-toggle" aria-label="메뉴 열기"><span></span><span></span><span></span></label>
      </header>

      <input class="nav-toggle" id="nav-toggle" type="checkbox" />
      <nav class="drawer" aria-label="메인 메뉴">
        <a href="/index.html">메인</a>
        <a href="/pages/jejusi.html">제주시</a>
        <a href="/pages/seogwipo.html">서귀포시</a>
        <a href="/pages/contact.html">입점문의</a>
        <a href="/pages/reviews.html">고객후기</a>
        <a href="/pages/info.html">정보안내</a>
      </nav>
      <label class="overlay" for="nav-toggle" aria-hidden="true"></label>

      <main class="content">
        <section class="page-title">
          <h1 class="postTitle">${safeTitle}</h1>
          <p class="sub">${safeDate}</p>
        </section>

        <article class="postView">
          ${imageBlock}
          <div class="postBody">${bodyHtml}</div>
        </article>

        <div class="backRow">
          <a class="backBtn" href="/pages/blog/index.html">← 목록으로</a>
        </div>
      </main>
    </div>
  </div>

  <script>
  // Auto-inject CTA buttons into blog post content
  (function(){
    function createCTAButton(){
      return \`
      <div class="post-cta-wrapper">
        <a href="https://www.jejutoktokyi.com/" class="post-cta-button">
          제주똑똑이 문의하기
        </a>
      </div>
      \`;
    }

    function injectCTAs(){
      const postBody = document.querySelector('.postBody');
      if(!postBody) return;

      // Prevent duplicate injection
      if(document.querySelector('.post-cta-wrapper')) return;

      const children = Array.from(postBody.children);
      const brs = children.filter(el => el.tagName === 'BR');

      // Strategy 1: Try inserting after a BR in the middle
      if(brs.length >= 10){
        const middleIndex = Math.floor(brs.length / 2);
        brs[middleIndex].insertAdjacentHTML('afterend', createCTAButton());
      }

      // Strategy 2: Always insert at the end
      postBody.insertAdjacentHTML('beforeend', createCTAButton());
    }

    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', injectCTAs);
    } else {
      injectCTAs();
    }
  })();
  </script>
</body>
</html>`;
  }

  function showCompose(){
    composeWrap.hidden=false;
    saveNoteEl.hidden=true;
    postTitleEl.focus();
  }
  function hideCompose(){
    composeWrap.hidden=true;
    saveNoteEl.hidden=true;
    postTitleEl.value="";
    postBodyEl.value="";
    postImageEl.value="";
  }

  writeBtn.addEventListener("click", () => {
    // 로그인은 prompt로 단순화(정적사이트라 UI 차단용)
    alert("관리자만 작성 가능합니다");
    const id = prompt("아이디 입력");
    const pw = prompt("비밀번호 입력");
    if(id===ADMIN_ID && pw===ADMIN_PW){
      isAdmin=true;
      showCompose();
    }else{
      alert("접근 불가");
    }
  });

  composeCancel.addEventListener("click", hideCompose);

  savePostBtn.addEventListener("click", () => {
    if(!isAdmin) return;

    const title=safeText(postTitleEl.value).trim();
    const body=safeText(postBodyEl.value).trim();
    const imgFile = (postImageEl.files && postImageEl.files[0]) ? postImageEl.files[0] : null;

    if(!title){ alert("제목을 입력하세요"); postTitleEl.focus(); return; }
    if(!body){ alert("내용을 입력하세요"); postBodyEl.focus(); return; }

    const now=new Date();
    const dateStr=formatDateKST(now);
    const baseName = ymdhm(now) + "-" + slugifyKo(title).slice(0,30);
    const htmlFileName = `${baseName}.html`;

    let imageWebPath="", imageDownloadName="";
    if(imgFile){
      const m=(imgFile.name||"").match(/\.([a-zA-Z0-9]+)$/);
      const ext=m?m[1].toLowerCase():"jpg";
      imageDownloadName = `${baseName}.${ext}`;
      imageWebPath = `/photo/blog/${imageDownloadName}`;
    }

    const bodyHtml=textToHtmlLines(body);
    const postHtml=buildPostHtml({title,date:dateStr,imageWebPath,bodyHtml});

    const meta={
      title,
      date: dateStr,
      ts: Date.now(),
      file: htmlFileName,
      excerpt: takeExcerpt(body),
      img: imageWebPath
    };

    posts.unshift(meta);
    posts.sort((a,b)=>(b.ts??0)-(a.ts??0));
    const jsonText=JSON.stringify(posts,null,2);

    // downloads
    downloadTextFile(htmlFileName, postHtml);
    downloadTextFile("index.json", jsonText);
    if(imgFile && imageDownloadName){
      downloadFileAs(imgFile, imageDownloadName);
    }

    currentPage=1;
    render();
    saveNoteEl.hidden=false;
  });

  (async function init(){
    await loadPosts();
    render();
  })();
})();