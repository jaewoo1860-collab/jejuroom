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
