import os
import re

ROOT = '/Users/william/Projects/venturo-erp'
filepath = 'src/features/finance/requests/types.ts'

with open(os.path.join(ROOT, filepath), 'r', encoding='utf-8') as f:
    original = f.read()

content = original

import_lines = []
for m in re.finditer(r"^import\s+\{[^}]+\}\s+from\s+['\"][^'\"]*constants/labels['\"];?\n?", content, re.MULTILINE):
    import_lines.append(m.group(0))

print(f"Imports: {len(import_lines)}")

for line in import_lines:
    content = content.replace(line, '')

content = re.sub(r'\n{3,}', '\n\n', content)

import_line = "import { useTranslations } from 'next-intl'\n"
last_import_end = 0
for m in re.finditer(r'^import\s+.*from\s+[\'\"].*[\'\"];?\n?', content, re.MULTILINE):
    last_import_end = m.end()
if last_import_end:
    content = content[:last_import_end] + import_line + content[last_import_end:]

print(f"Has useTranslations: {'useTranslations' in content}")
print(f"Changed: {content != original}")

if content != original:
    with open(os.path.join(ROOT, filepath), 'w', encoding='utf-8') as f:
        f.write(content)
    print("Written!")
else:
    print("NOT written")
