import { useState, useEffect, useCallback } from 'react';

const VALID_PAGES = [
  'home',
  'first-shift',
  'console',
  'shop',
  'notices',
  'investigations',
  'profile',
] as const;

type Page = (typeof VALID_PAGES)[number];

function isPage(value: string): value is Page {
  return (VALID_PAGES as readonly string[]).includes(value);
}

function getPageFromHash(): Page {
  const hash = window.location.hash.slice(1);
  return isPage(hash) ? hash : 'home';
}

export function useRouter() {
  const [page, setPage] = useState<Page>(getPageFromHash);

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

  const navigate = useCallback((target: Page | string) => {
    window.location.hash = target;
  }, []);

  return { page, navigate };
}
