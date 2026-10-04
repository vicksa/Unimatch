import type {NextConfig} from 'next';
// Provider domains proxy the API; load Clerk's browser bundles from its npm CDN.
const config:NextConfig={async headers(){return [{source:'/downloads/UniMatch-0.2.apk',headers:[{key:'Content-Type',value:'application/vnd.android.package-archive'},{key:'Content-Disposition',value:'attachment; filename="UniMatch-0.2.apk"'}]}]},env:{NEXT_PUBLIC_CLERK_JS_URL:'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6/dist/clerk.browser.js',NEXT_PUBLIC_CLERK_UI_URL:'https://cdn.jsdelivr.net/npm/@clerk/ui@1/dist/ui.browser.js'}};
export default config;
