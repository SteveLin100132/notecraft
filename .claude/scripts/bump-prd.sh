#!/usr/bin/env bash
set -euo pipefail

PRD="docs/notecraft-prd.md"

err() { echo "❌ $*" >&2; exit 1; }

[ "$#" -eq 3 ] || err "用法: bump-prd.sh <new_version> <category> <summary>  (got $# args)"

NEW_VER="$1"
CATEGORY="$2"
SUMMARY="$3"

[[ "$NEW_VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || err "版號格式錯誤: '$NEW_VER' (需符合 X.Y.Z, 例: 1.5.0)"

case "$CATEGORY" in
  Added|Changed|Fixed) ;;
  *) err "Category 必須是 Added / Changed / Fixed 其中之一, 收到: '$CATEGORY'" ;;
esac

[ -n "${SUMMARY// /}" ] || err "Summary 不可為空"

[ -f "$PRD" ] || err "找不到 PRD 檔案: $PRD"

OLD_RAW=$(grep -E '^文件版本:[[:space:]]*v?[0-9]+(\.[0-9]+){1,2}[[:space:]]*$' "$PRD" | head -n1 || true)
[ -n "$OLD_RAW" ] || err "在 $PRD 找不到 '文件版本:' 行"
OLD_VER=$(echo "$OLD_RAW" | sed -E 's/^文件版本:[[:space:]]*v?([0-9.]+)[[:space:]]*$/\1/')

TODAY=$(date +%Y-%m-%d)

NEW_VER_FULL="$NEW_VER"
OLD_VER_FULL="$OLD_VER"
case "$OLD_VER" in
  *.*.*) ;;
  *.*)   OLD_VER_FULL="${OLD_VER}.0" ;;
  *)     OLD_VER_FULL="${OLD_VER}.0.0" ;;
esac

ver_to_int() {
  IFS=. read -r a b c <<<"$1"
  printf "%d%03d%03d" "$a" "$b" "$c"
}
OLD_N=$(ver_to_int "$OLD_VER_FULL")
NEW_N=$(ver_to_int "$NEW_VER_FULL")
[ "$NEW_N" -gt "$OLD_N" ] || err "新版號必須大於舊版號 (舊: $OLD_VER, 新: $NEW_VER)"

python3 - "$PRD" "$NEW_VER" "$TODAY" "$CATEGORY" "$SUMMARY" <<'PY'
import sys, re, io
path, new_ver, today, category, summary = sys.argv[1:6]
with open(path, "r", encoding="utf-8") as f:
    text = f.read()

text, n1 = re.subn(
    r'^(文件版本:[ \t]*)v?[0-9]+(?:\.[0-9]+){1,2}[ \t]*$',
    lambda m: m.group(1) + "v" + new_ver,
    text, count=1, flags=re.M,
)
if n1 != 1:
    print("❌ 替換『文件版本』失敗", file=sys.stderr); sys.exit(1)

text, n2 = re.subn(
    r'^(更新日期:[ \t]*)[0-9]{4}-[0-9]{2}-[0-9]{2}[ \t]*$',
    lambda m: m.group(1) + today,
    text, count=1, flags=re.M,
)
if n2 != 1:
    print("❌ 替換『更新日期』失敗", file=sys.stderr); sys.exit(1)

entry = f"### [{new_ver}] - {today}\n- **{category}**: {summary}\n"

heading_re = re.compile(r'^(##[ \t]+[0-9]+\.[ \t]*Change[ \t]*Log（變更紀錄）[ \t]*)$', re.M)
m = heading_re.search(text)
if m:
    insert_at = m.end()
    rest = text[insert_at:]
    rest_stripped = rest.lstrip("\n")
    text = text[:insert_at] + "\n\n" + entry + ("\n" + rest_stripped if rest_stripped else "")
else:
    if not text.endswith("\n"):
        text += "\n"
    text += "\n## 11. Change Log（變更紀錄）\n\n" + entry

with open(path, "w", encoding="utf-8") as f:
    f.write(text)
PY

echo "✅ PRD 版本已更新: $OLD_VER → $NEW_VER"
echo "   Category: $CATEGORY"
echo "   Summary: $SUMMARY"