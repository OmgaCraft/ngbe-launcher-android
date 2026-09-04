package fr.ngbe.launcher.mobile;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // The web UI navigates to minecraft:// to launch the game, and to real
    // https:// URLs (wiki, articles) that should open in a browser, not
    // replace our own UI inside the WebView. Only same-origin navigation
    // (Capacitor serves the app itself from https://localhost) is left
    // alone; everything else is handed off to Android's intent resolver.
    getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if ("localhost".equals(uri.getHost())) {
          return super.shouldOverrideUrlLoading(view, request);
        }
        try {
          Intent intent = new Intent(Intent.ACTION_VIEW, uri);
          intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
          startActivity(intent);
        } catch (ActivityNotFoundException e) {
          Toast.makeText(getApplicationContext(), "Application introuvable pour ce lien", Toast.LENGTH_SHORT).show();
        }
        return true;
      }
    });
  }
}
