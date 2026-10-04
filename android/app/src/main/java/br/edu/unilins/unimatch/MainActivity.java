package br.edu.unilins.unimatch;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/** The trusted UniMatch site runs in the app's own WebView, with no browser toolbar. */
public final class MainActivity extends BridgeActivity {
    static final String ORIGIN = "https://unimatch-unilins.vercel.app";
    private View connectionError;

    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeDownloadsPlugin.class);
        super.onCreate(savedInstanceState);
        if (bridge == null) return;
        WebView web = bridge.getWebView();
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setMediaPlaybackRequiresUserGesture(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        connectionError = makeConnectionError();
        addContentView(connectionError, new android.view.ViewGroup.LayoutParams(-1,-1));
        connectionError.setVisibility(View.GONE);
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return super.shouldOverrideUrlLoading(view, request);
                if (isAppUrl(request.getUrl())) return false;
                if (request.hasGesture()) openExternal(request.getUrl());
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                super.onPageStarted(view,url,favicon);
                connectionError.setVisibility(View.GONE);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view,request,error);
                if (request.isForMainFrame()) connectionError.setVisibility(View.VISIBLE);
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                super.onReceivedHttpError(view,request,response);
                if (request.isForMainFrame() && response.getStatusCode() >= 400) connectionError.setVisibility(View.VISIBLE);
            }
        });
        web.setDownloadListener((url,agent,disposition,mime,length) -> openExternal(Uri.parse(url)));
        getOnBackPressedDispatcher().addCallback(this,new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (connectionError.getVisibility()==View.VISIBLE) { finish(); return; }
                web.evaluateJavascript("Boolean(window.unimatchAndroidBack && window.unimatchAndroidBack())",result -> {
                    if ("true".equals(result)) return;
                    if (web.canGoBack()) web.goBack(); else finish();
                });
            }
        });
    }

    static boolean isAppUrl(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme()) && "unimatch-unilins.vercel.app".equalsIgnoreCase(uri.getHost())
            && uri.getUserInfo()==null && (uri.getPort()==-1 || uri.getPort()==443);
    }
    private void openExternal(Uri uri) {
        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            Toast.makeText(this,"Esse arquivo não pode ser aberto pelo navegador.",Toast.LENGTH_SHORT).show(); return;
        }
        try { startActivity(new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException e) { Toast.makeText(this,"Nenhum app disponível para abrir esse link.",Toast.LENGTH_SHORT).show(); }
    }
    private View makeConnectionError() {
        LinearLayout panel=new LinearLayout(this);panel.setOrientation(LinearLayout.VERTICAL);panel.setGravity(Gravity.CENTER);
        panel.setBackgroundColor(Color.WHITE);int padding=Math.round(32*getResources().getDisplayMetrics().density);panel.setPadding(padding,padding,padding,padding);
        TextView title=new TextView(this);title.setText("Vamos reconectar?");title.setTextSize(26);title.setTypeface(null,Typeface.BOLD);title.setTextColor(Color.rgb(32,37,45));panel.addView(title);
        TextView text=new TextView(this);text.setText("Confira sua conexão e tente novamente. Seu perfil continua salvo na sua conta.");text.setTextSize(16);text.setGravity(Gravity.CENTER);text.setPadding(0,24,0,24);panel.addView(text);
        Button retry=new Button(this);retry.setText("Tentar novamente");retry.setAllCaps(false);retry.setOnClickListener(v->{connectionError.setVisibility(View.GONE);bridge.reload();});panel.addView(retry);
        return panel;
    }
    @Override public void onPause() { super.onPause(); CookieManager.getInstance().flush(); }
}
