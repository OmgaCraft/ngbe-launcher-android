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

    // The web UI navigates to custom schemes (minecraft://...) to launch the
    // game. A plain WebView swallows those silently, so we hand anything
    // that isn't http(s) off to Android's own intent resolver instead.
    getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        String scheme = uri.getScheme();
        if (scheme != null && !scheme.equals("http") && !scheme.equals("https")) {
          try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
          } catch (ActivityNotFoundException e) {
            Toast.makeText(getApplicationContext(), "Application introuvable pour ce lien", Toast.LENGTH_SHORT).show();
          }
          return true;
        }
        return super.shouldOverrideUrlLoading(view, request);
      }
    });
  }
}
