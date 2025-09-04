/*
 * Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */

/* global Office */

Office.onReady(() => {
  // If needed, Office.js is ready to be called.
});

/**
 * Shows a notification when the add-in command is executed.
 * @param event
 */
function action(event: Office.AddinCommands.Event) {
  const message: Office.NotificationMessageDetails = {
    type: Office.MailboxEnums.ItemNotificationMessageType.InformationalMessage,
    message: "Performed action.",
    icon: "Icon.80x80",
    persistent: true,
  };

  // Show a notification message.
  Office.context.mailbox.item?.notificationMessages.replaceAsync(
    "ActionPerformanceNotification",
    message
  );

  // Be sure to indicate when the add-in command function is complete.
  event.completed();
}

/**
 * Shows help information about Kanosym custom functions
 * @param event
 */
function showFunctionsHelp(event: Office.AddinCommands.Event) {
  // Show a dialog with custom functions help
  Office.context.ui.displayDialogAsync(
    'https://localhost:3000/functions-help.html',
    { height: 60, width: 80 },
    (result) => {
      if (result.status === Office.AsyncResultStatus.Failed) {
        console.error('Dialog failed to open:', result.error);
      }
    }
  );

  // Be sure to indicate when the add-in command function is complete.
  event.completed();
}

// Register the functions with Office.
Office.actions.associate("action", action);
Office.actions.associate("showFunctionsHelp", showFunctionsHelp);
