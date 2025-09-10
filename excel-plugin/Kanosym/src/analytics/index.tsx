import React from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import AnalyticsApp from "./components/AnalyticsApp";

/* global document, Office, module, require */

const title = "Kanosym - Analytics";

const rootElement = document.getElementById("container");
const root = createRoot(rootElement!);

/* Render application after Office initializes */
Office.onReady(() => {
  root.render(
    <FluentProvider theme={webLightTheme}>
      <AnalyticsApp title={title} />
    </FluentProvider>
  );
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/AnalyticsApp", () => {
    const NextAnalyticsApp = require("./components/AnalyticsApp").default;
    root.render(
      <FluentProvider theme={webLightTheme}>
        <NextAnalyticsApp title={title} />
      </FluentProvider>
    );
  });
}
