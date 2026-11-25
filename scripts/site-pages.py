"""Lists every .html page with its last change (date + note) for the Quick Links sheet.
Run by .github/workflows/site-pages.yml; output goes to data/site-pages.json."""
import json, re, subprocess
from datetime import datetime, timezone

REPO = 'Werewolf3788/SMLC'
BRANCH = 'Claude-Test'
SITE = 'https://werewolf3788.github.io/SMLC/'
SKIP = re.compile(r'^(full|test|wordpress|node_modules|local-news)/')

def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()

pages = []
for path in sorted(git('ls-files', '*.html', '*.htm').splitlines()):
    if SKIP.match(path):
        continue
    # Newest commit that changed this page, ignoring the bots' own housekeeping commits
    log = git('log', '-1', '--format=%cI%x1f%s', '--invert-grep', '--grep=^Quick Links: update page list', '--', path)
    if not log:
        continue
    when, msg = log.split('\x1f', 1)
    clean = re.sub(r'(^|/)index\.html?$', r'\1', path)
    clean = re.sub(r'\.html?$', '', clean)
    pages.append({
        'path': path,
        'url': SITE + clean,
        'github': f'https://github.com/{REPO}/blob/{BRANCH}/{path}',
        'updated': when,
        'message': msg[:140],
    })

print(json.dumps({'generated': datetime.now(timezone.utc).isoformat(timespec='seconds'),
                  'repo': REPO, 'branch': BRANCH, 'pages': pages}, indent=1))
