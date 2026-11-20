Synthetic text only. `word97-synthetic.rtf` contains explicit Unicode escapes and was converted by available LibreOffice with:

```
soffice -env:UserInstallation=file:///tmp/jobmatch-doc-fixture-20261120 --headless --convert-to 'doc:MS Word 97' --outdir tests/fixtures/browser-import tests/fixtures/browser-import/word97-synthetic.rtf
soffice -env:UserInstallation=file:///tmp/jobmatch-doc-fixture-20261120 --headless --convert-to docx --outdir tests/fixtures/browser-import tests/fixtures/browser-import/word97-synthetic.rtf
```
The .doc is genuine binary OLE/CFB Word97, not renamed text. Expected main-story text in word97-expected.txt. No macros, real person or credentials.
