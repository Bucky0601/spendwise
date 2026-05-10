package com.spendwise.app;

import android.os.Bundle;
import androidx.annotation.Nullable;

public class LauncherActivity extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // The base class handles the TWA launch.
        // We ensure finish() is called if the base class didn't already.
        if (!isFinishing()) {
            finish();
        }
    }

    @Override
    protected boolean shouldLaunchImmediately() {
        return true;
    }
}
