import { useAuthStore } from '@/store/modules/auth';

export function useAuth() {
  const authStore = useAuthStore();

  function hasAuth(codes: string | string[]) {
    if (!authStore.isLogin) {
      return false;
    }

    if (typeof codes === 'string') {
      return authStore.userInfo.capabilities.includes(codes);
    }

    return codes.some(code => authStore.userInfo.capabilities.includes(code));
  }

  function hasView(viewKey: string) {
    if (!authStore.isLogin) {
      return false;
    }

    return authStore.userInfo.visibleViews.some(view => {
      if (typeof view === 'string') return view === viewKey;
      return view.viewKey === viewKey;
    });
  }

  return {
    hasAuth,
    hasView
  };
}
