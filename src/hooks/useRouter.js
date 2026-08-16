import { useState, useEffect } from 'react';

const VALID_PAGES = ['home', 'first-shift', 'console', 'profile'];

function getPageFromHash() {
  const hash = window.location.hash.slice(1);
  return VALID_PAGES.includes(hash) ? hash : 'home';
}

export function useRouter() {
  const [page, setPage] = useState(getPageFromHash);

  useEffect(() => {
    function onHashChange() {
      setPage(getPageFromHash());
    }
    window.addEventListener('hashchange', onHashChange);

    // set initial hash
    if (!window.location.hash) {
      window.location.hash = '#home';
    }

    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function navigate(target) {
    window.location.hash = target;
  }

  return { page, navigate };
}
