import { defineConfig } from 'vitepress'
const gh = 'https://github.com/mhmdelbadry74/laraselector'
const url = 'https://mhmdelbadry74.github.io/laraselector/'
const sidebar = (p, t) => [{ text: t.group, items: [
  { text: t.start, link: `${p}/guide/getting-started` },
  { text: t.ext, link: `${p}/guide/chrome-extension` },
  { text: t.config, link: `${p}/guide/configuration` },
  { text: t.sec, link: `${p}/guide/security` },
  { text: t.help, link: `${p}/guide/troubleshooting` } ] }]
export default defineConfig({
  title: 'LaraSelector', base: '/laraselector/', cleanUrls: true,
  head: [['link', { rel: 'icon', href: '/laraselector/favicon.svg' }],
    ['meta', { property: 'og:image', content: url + 'og.png' }],
    ['meta', { property: 'og:title', content: 'LaraSelector' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }]],
  themeConfig: { logo: '/logo.svg', search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: gh }],
    footer: { message: 'MIT License', copyright: 'LaraSelector' } },
  locales: {
    root: { label: 'English', lang: 'en', description: 'Click an element in the browser, open its Blade file or controller in your editor.',
      themeConfig: { nav: [{ text: 'Guide', link: '/guide/getting-started' }, { text: 'Download extension', link: '/guide/chrome-extension' }, { text: 'Packagist', link: 'https://packagist.org/packages/mhmdelbadry74/laraselector-laravel' }],
        sidebar: sidebar('', { group: 'Guide', start: 'Getting started', ext: 'Chrome extension', config: 'Configuration', sec: 'Security', help: 'Troubleshooting' }) } },
    ar: { label: 'العربية', lang: 'ar', dir: 'rtl', link: '/ar/', description: 'اضغط على عنصر في المتصفح وافتح ملف Blade أو الـ controller الخاص به في محررك.',
      themeConfig: { nav: [{ text: 'الدليل', link: '/ar/guide/getting-started' }, { text: 'تحميل الإضافة', link: '/ar/guide/chrome-extension' }, { text: 'Packagist', link: 'https://packagist.org/packages/mhmdelbadry74/laraselector-laravel' }],
        sidebar: sidebar('/ar', { group: 'الدليل', start: 'البدء السريع', ext: 'إضافة Chrome', config: 'الإعدادات', sec: 'الأمان', help: 'حل المشاكل' }),
        outlineTitle: 'في هذه الصفحة', docFooter: { prev: 'السابق', next: 'التالي' }, sidebarMenuLabel: 'القائمة', returnToTopLabel: 'للأعلى', darkModeSwitchLabel: 'المظهر', langMenuLabel: 'اللغة',
        search: { provider: 'local' } } } }
})
