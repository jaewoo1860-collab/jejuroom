// Auto-inject CTA buttons into blog post content
// Add this script to any blog post HTML: <script src="/pages/blog/inject-cta.js"></script>
(function(){
  function createCTAButton(){
    return `
    <div class="post-cta-wrapper">
      <a href="https://www.jejutoktokyi.com/" class="post-cta-button">
        제주똑똑이 문의하기
      </a>
    </div>
    `;
  }

  function injectCTAs(){
    const postBody = document.querySelector('.postBody');
    if(!postBody) return;

    const children = Array.from(postBody.children);
    const brs = children.filter(el => el.tagName === 'BR');

    // Insert middle CTA after 3rd <br> if exists
    if(brs.length >= 4){
      brs[2].insertAdjacentHTML('afterend', createCTAButton());
    }

    // Insert CTA at the end
    postBody.insertAdjacentHTML('beforeend', createCTAButton());
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', injectCTAs);
  } else {
    injectCTAs();
  }
})();
