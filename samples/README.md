# Sample files for testing import

Use these in **Dashboard → Import file** (or the demo video). Limits: `.txt`, `.md`, `.docx`, max 5 MB.

| File | Expected result |
|---|---|
| `product-brief.docx` | New doc "product-brief": H1, two H2s, an H3, a bullet list, a numbered list, **bold**, *italic*, <u>underline</u> |
| `launch-plan.md` | New doc "launch-plan": H1–H3, bullet + numbered lists, bold, italic, blockquote. The table and task-list boxes become plain text (tables are out of scope) |
| `meeting-notes.txt` | New doc "meeting-notes": one paragraph per blank-line-separated block, no formatting |
| `unsupported.pdf` | Rejected before upload: "Only .txt, .md and .docx files are supported" |
| `empty.md` | Rejected: the file is empty |

Too-large check: create a 6 MB file and import it — expect "File is larger than 5 MB".

```bash
# Git Bash / macOS / Linux
head -c 6000000 /dev/zero | tr '\0' 'a' > big.md
```
