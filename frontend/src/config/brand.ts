const appTitle = import.meta.env.VITE_APP_TITLE || 'JobTap Admin';
const appDescription = import.meta.env.VITE_APP_DESC || 'JobTap Admin is a configurable admin workspace.';
const showLoginDemoAccounts = import.meta.env.VITE_LOGIN_SHOW_DEMO_ACCOUNTS
  ? import.meta.env.VITE_LOGIN_SHOW_DEMO_ACCOUNTS === 'Y'
  : !import.meta.env.PROD;

export const brandConfig = {
  name: 'JobTap',
  appTitle,
  appDescription,
  systemTitle: {
    'zh-CN': 'JobTap 管理系统',
    'en-US': 'JobTap Admin'
  },
  watermarkText: 'JobTap',
  footer: {
    text: 'Copyright © 2026 JobTap',
    href: null
  },
  login: {
    showDemoAccounts: showLoginDemoAccounts
  },
  demoAccounts: {
    super: {
      identifier: 'JobTap',
      password: '123456'
    },
    admin: {
      identifier: 'Administrator',
      password: '123456'
    },
    user: {
      identifier: 'GeneralUser',
      password: '123456'
    }
  },
  projectNews: {
    'zh-CN': [
      'JobTap 已完成品牌化配置，后续可按客户快速替换 LOGO 与文案。',
      '新的品牌入口已经收敛，登录页、侧栏和加载页会保持一致展示。',
      '默认演示账号已同步更新，便于交付时快速验证客户品牌。',
      '浏览器标题、favicon 和页脚版权现已统一走品牌配置。',
      '首页演示内容已替换为品牌中性文案，减少模板痕迹。'
    ],
    'en-US': [
      'JobTap branding is now centralized for fast customer-specific logo and copy updates.',
      'The login page, sider, and loading screen now share the same brand entry points.',
      'Default demo accounts have been aligned with the new branding for delivery verification.',
      'Browser title, favicon, and footer copyright now follow the brand configuration.',
      'Homepage demo content has been rewritten to remove template-specific branding traces.'
    ]
  }
} as const;

export function formatDocumentTitle(pageTitle?: string | null) {
  if (!pageTitle) {
    return brandConfig.appTitle;
  }

  return `${pageTitle} | ${brandConfig.appTitle}`;
}
