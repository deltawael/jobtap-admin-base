import type { Router } from 'vue-router';
import { useTitle } from '@vueuse/core';
import { formatDocumentTitle } from '@/config/brand';
import { $t } from '@/locales';

export function createDocumentTitleGuard(router: Router) {
  router.afterEach(to => {
    const { i18nKey, title } = to.meta;

    const documentTitle = formatDocumentTitle(i18nKey ? $t(i18nKey) : title);

    useTitle(documentTitle);
  });
}
