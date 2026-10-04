package br.edu.unilins.unimatch;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.List;

/** Browser-powered Android client. Never receives passwords, cookies or auth tokens. */
public final class MainActivity extends Activity {
    static final String ORIGIN = "https://unimatch-unilins.vicksa.chatgpt.site";
    private static final int BLUE = Color.rgb(23,73,209);
    private static final int INK = Color.rgb(32,37,45);
    private static final int MUTED = Color.rgb(98,107,121);

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(Color.WHITE);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(28);
        root.setPadding(pad,pad,pad,pad);
        scroll.addView(root);
        scroll.setOnApplyWindowInsetsListener((view,insets)-> {
            android.graphics.Insets bars;
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                bars = insets.getInsets(WindowInsets.Type.systemBars());
                view.setPadding(bars.left,bars.top,bars.right,bars.bottom);
            } else { view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom()); }
            return insets;
        });
        root.addView(text("UniMatch",34,INK,true,0));
        root.addView(text("COMUNIDADE UNILINS",12,MUTED,true,2));
        root.addView(text("Quem você ainda\nnão conhece?",36,INK,true,68));
        root.addView(text("Um campus. Muitas histórias.",17,MUTED,false,18));
        root.addView(text("Conheça pessoas de outros cursos, encontre interesses em comum e converse depois do match.",17,INK,false,36));
        root.addView(button("Abrir UniMatch",true,()->openPilot()));
        root.addView(text("Este APK conecta você ao piloto online. A interface e o login são exibidos pelo navegador seguro do Android, com sua sessão existente.",14,MUTED,false,16));
        root.addView(button("Privacidade e regras",false,()->showPrivacy()));
        root.addView(text("Piloto independente · Somente 18+\nSem integração com o portal acadêmico. O acesso ainda é privado; perfis reais exigem aprovação de vínculo.",13,MUTED,false,36));
        root.addView(text("Versão 0.1.0 · Android",12,MUTED,false,24));
        setContentView(scroll);
        scroll.requestApplyInsets();
    }

    private void openPilot() {
        Uri uri=Uri.parse(ORIGIN+"/");
        Intent intent=new Intent(Intent.ACTION_VIEW,uri);
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        // Custom Tabs protocol: null SESSION means a browser-managed session.
        Bundle extras=new Bundle();
        extras.putBinder("android.support.customtabs.extra.SESSION",null);
        extras.putInt("android.support.customtabs.extra.TOOLBAR_COLOR",BLUE);
        extras.putInt("android.support.customtabs.extra.TITLE_VISIBILITY",1);
        extras.putBoolean("android.support.customtabs.extra.ENABLE_URLBAR_HIDING",false);
        intent.putExtras(extras);
        Intent browserProbe=new Intent(Intent.ACTION_VIEW,uri).addCategory(Intent.CATEGORY_BROWSABLE);
        ResolveInfo preferred=getPackageManager().resolveActivity(browserProbe,0);
        if(preferred!=null && supportsTabs(preferred.activityInfo.packageName)) {
            intent.setPackage(preferred.activityInfo.packageName);
        } else {
            List<ResolveInfo> browsers=getPackageManager().queryIntentActivities(browserProbe,0);
            for(ResolveInfo browser:browsers) {
                if(supportsTabs(browser.activityInfo.packageName)) {
                    intent.setPackage(browser.activityInfo.packageName);break;
                }
            }
        }
        try { startActivity(intent); }
        catch(ActivityNotFoundException e) {
            new AlertDialog.Builder(this).setTitle("Navegador necessário")
                .setMessage("Instale ou ative um navegador com suporte a HTTPS, como o Chrome, para abrir o UniMatch.")
                .setPositiveButton("Entendi",null).show();
        }
    }
    private boolean supportsTabs(String packageName) {
        Intent service=new Intent("android.support.customtabs.action.CustomTabsService").setPackage(packageName);
        return getPackageManager().resolveService(service,0)!=null;
    }
    private void showPrivacy() {
        new AlertDialog.Builder(this).setTitle("Privacidade no UniMatch")
            .setMessage("O APK não recebe nem armazena sua senha, cookies ou mensagens. O navegador gerencia o login. Não há permissões de câmera, localização, contatos ou arquivos no APK.\n\nOs dados do perfil e as conversas ficam no serviço online. Mensagens não têm criptografia de ponta a ponta. Consulte os termos dentro do piloto antes de cadastrar dados reais.\n\nEste é um piloto independente, privado e exclusivo para maiores de 18 anos. O vínculo acadêmico não é verificado pelo login. Denúncias precisam de uma equipe de moderação configurada.")
            .setPositiveButton("Entendi",null).show();
    }
    private TextView text(String value,int size,int color,boolean bold,int top) {
        TextView view=new TextView(this);view.setText(value);view.setTextSize(size);view.setTextColor(color);
        view.setTypeface(Typeface.create("sans-serif",bold?Typeface.BOLD:Typeface.NORMAL));
        view.setLineSpacing(dp(4),1);LinearLayout.LayoutParams params=new LinearLayout.LayoutParams(-1,-2);params.topMargin=dp(top);view.setLayoutParams(params);return view;
    }
    private Button button(String value,boolean filled,Runnable action) {
        Button view=new Button(this);view.setText(value);view.setAllCaps(false);view.setTextSize(16);view.setTextColor(filled?Color.WHITE:BLUE);
        GradientDrawable background=new GradientDrawable();background.setColor(filled?BLUE:Color.WHITE);background.setCornerRadius(dp(10));if(!filled)background.setStroke(dp(1),Color.rgb(220,225,233));view.setBackground(background);
        view.setPadding(dp(18),dp(12),dp(18),dp(12));view.setMinHeight(dp(54));LinearLayout.LayoutParams params=new LinearLayout.LayoutParams(-1,-2);params.topMargin=dp(24);view.setLayoutParams(params);view.setOnClickListener(v->action.run());return view;
    }
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
}
