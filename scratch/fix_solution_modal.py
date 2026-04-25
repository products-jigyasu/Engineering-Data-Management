import sys

filepath = r'components\modals\workflow-modals.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Using the exact characters shown in the debug output (JSX angle brackets are < and >)
old_block = (
    "      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>\n"
    "        <button type=\"button\" onClick={onClose} style={S.secBtn}>Cancel</button>\n"
    "        <button type=\"submit\" disabled={isSubmitting || !assignee || !canAct} style={primaryBtn(isSubmitting || !assignee || !canAct)}>\n"
    "          {isSubmitting && <Loader2 size={14} className=\"animate-spin\" />} Assign & Notify\n"
    "        </button>\n"
    "      </div>\n"
    "    </form>\n"
    "  );\n"
    "};"
)

new_block = (
    "      <div style={{ display: 'flex', gap: '10px', marginTop: '24px', flexWrap: 'wrap' }}>\n"
    "        <button type=\"button\" onClick={onClose} style={S.secBtn}>Cancel</button>\n"
    "        {canAct && (\n"
    "          <button type=\"button\" onClick={onReassign}\n"
    "            style={{ padding: '10px 14px', border: '1px solid #f59e0b', borderRadius: '7px', background: '#fffbeb', color: '#92400e', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: \"'Inter',sans-serif\", display: 'flex', alignItems: 'center', gap: '6px' }}>\n"
    "            <RotateCcw size={13} /> Reassign to FT\n"
    "          </button>\n"
    "        )}\n"
    "        <button type=\"submit\" disabled={isSubmitting || !assignee || !canAct} style={primaryBtn(isSubmitting || !assignee || !canAct)}>\n"
    "          {isSubmitting && <Loader2 size={14} className=\"animate-spin\" />} Assign & Notify\n"
    "        </button>\n"
    "      </div>\n"
    "    </form>\n"
    "  );\n"
    "};"
)

if old_block in content:
    content = content.replace(old_block, new_block, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Reassign button added to AssignSolutionModal')
else:
    print('NOT FOUND. Checking exact chars around line 242-250...')
    # Find the div with flex gap 24px in solution modal area
    idx = content.find("display: 'flex', gap: '10px', marginTop: '24px' }}>", 6000, 10000)
    print(f'Found at index: {idx}')
    print(repr(content[idx-10:idx+300]))
    sys.exit(1)
