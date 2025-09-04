import React from "react";
import { createRoot } from "react-dom/client";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import NoiraApp from "./components/NoiraApp";

/* global document, Office, module, require */

const title = "Kanosym - Noira Copilot";

const rootElement = document.getElementById("container");
const root = createRoot(rootElement!);

/* Render application after Office initializes */
Office.onReady(() => {
  root.render(
    <FluentProvider theme={webLightTheme}>
      <NoiraApp title={title} />
    </FluentProvider>
  );
});

if ((module as any).hot) {
  (module as any).hot.accept("./components/NoiraApp", () => {
    const NextNoiraApp = require("./components/NoiraApp").default;
    root.render(
      <FluentProvider theme={webLightTheme}>
        <NextNoiraApp title={title} />
      </FluentProvider>
    );
  });
}
