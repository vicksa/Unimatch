package br.edu.unilins.unimatch;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** Saves the user's requested export via Android's document picker, without storage permissions. */
@CapacitorPlugin(name="NativeDownloads")
public final class NativeDownloadsPlugin extends Plugin {
    @PluginMethod public void saveJson(PluginCall call) {
        String data=call.getString("data");
        if(data==null || data.length()>4000000) { call.reject("Exportação muito grande."); return; }
        try { new JSONObject(data); } catch(Exception e) { call.reject("Arquivo inválido."); return; }
        Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json");
        intent.putExtra(Intent.EXTRA_TITLE,"meus-dados-unimatch.json");
        startActivityForResult(call,intent,"createdFile");
    }
    @ActivityCallback private void createdFile(PluginCall call, ActivityResult result) {
        if(call==null)return;
        if(result.getResultCode()!=Activity.RESULT_OK || result.getData()==null || result.getData().getData()==null) {
            JSObject response=new JSObject();response.put("cancelled",true);call.resolve(response);return;
        }
        String data=call.getString("data");
        if(data==null){call.reject("Arquivo indisponível.");return;}
        try(OutputStream stream=getContext().getContentResolver().openOutputStream(result.getData().getData())) {
            if(stream==null){call.reject("Não foi possível salvar o arquivo.");return;}
            stream.write(data.getBytes(StandardCharsets.UTF_8));call.resolve();
        } catch(Exception e){call.reject("Não foi possível salvar o arquivo.");}
    }
}
