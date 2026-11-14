# Native WebGL2 source

This directory contains the native WebGL2 implementation, worker parsers,
optional archive support, mesh bridge and TypeScript declarations.

See [usage](../docs/v2-usage.md) and
[the compatibility requirements](../docs/v2-compatibility.md).
The legacy implementation is preserved in `../legacy/v1/src/` and on `master`.

`session.js` coordinates loading and editing without site controls. Website UI
modules are maintained outside this repository. Do not add page-specific DOM IDs,
dialogs, branding or toolbar policy to the plugin.
