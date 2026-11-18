# Local profile MVP

The user explicitly chooses to paste their own resume text, then use it for this tab or save it in this browser. There is no file upload and no applicant HH API call in the main workflow. Up to five named profiles are stored under a versioned localStorage key, with strict schema and size checks. Saving is explicit, never on input. Editing invalidates the selection and old result. Browser storage failures do not report success; corrupt/stale-tab data is not overwritten. Deleting requires the user's explicit browser confirmation.

Profiles do not sync, are not encrypted, and disappear if site storage is cleared. The UI warns against shared devices and unnecessary sensitive data. This is not a cloud account or durable backup. Browser extensions and same-origin scripts can access local storage; this is not a secure vault. Cross-tab check prevents obvious stale writes but is not an atomic database transaction.

The main page calls the deterministic adaptation function directly in the browser. Resume text is not sent to the JobMatch adaptation API or external model. Vacancy retrieval still uses the server and HH application token. Legacy endpoints remain gated as before. The output prioritizes existing evidence and quotes source facts; it does not freely rewrite or verify truth. Skills without eligible evidence are not added. Copying into HH and applying remain manual.

Validation covers schema bounds, corrupt storage, stale writes, storage errors, no-network local adaptation, and UI architecture. Full browser save/reload/edit/delete workflow requires a browser smoke test; unit tests are not a substitute.
